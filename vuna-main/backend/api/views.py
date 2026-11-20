import uuid as uuid_lib

from django.db import transaction
from django.db.models import Q
from django.core.files.storage import default_storage
from rest_framework import filters, mixins, viewsets, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema

from .models import User, Product, Order, ChatMessage
from . import schema
from .accounts import issue_one_time_password
from .phone import normalize_ke_phone
from .permissions import IsAdmin, IsBuyer, IsDriver, IsFarmer, IsProductOwnerOrAdmin
from .pricing import listed_price, price_order
from .serializers import (
    UserSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    ProductSerializer,
    OrderSerializer,
    DriverSerializer,
    ChatMessageSerializer,
)


# ────────────────────────────────────────────────────────────
#  Permission helpers
# ────────────────────────────────────────────────────────────
# Role and ownership permissions live in api/permissions.py


# ────────────────────────────────────────────────────────────
#  Auth views
# ────────────────────────────────────────────────────────────
class RegisterView(APIView):
    permission_classes = []
    throttle_scope = 'register'

    @extend_schema(request=RegisterSerializer, responses={201: schema.AuthResponse, 400: OpenApiTypes.OBJECT})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = []
    throttle_scope = 'login'

    @extend_schema(request=schema.LoginRequest, responses={200: schema.AuthResponse, 400: schema.ErrorResponse, 401: schema.ErrorResponse})
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        if not email or not password:
            return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=email, password=password)
        if not user:
            return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: schema.DetailResponse})
    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)


# ────────────────────────────────────────────────────────────
#  Profile views
# ────────────────────────────────────────────────────────────
class ProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(operation_id='profile_me', responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(operation_id='profile_me_update', request=ProfileUpdateSerializer, responses={200: UserSerializer, 400: OpenApiTypes.OBJECT})
    def put(self, request):
        user = request.user
        serializer = ProfileUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PublicProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(operation_id='profile_public', responses={200: schema.PublicProfileResponse, 404: schema.ErrorResponse})
    def get(self, request, uid):
        try:
            user = User.objects.get(uid=uid)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        products = Product.objects.filter(farmer=user, is_active=True).order_by('-created_at')
        product_data = ProductSerializer(products, many=True, context={'request': request}).data

        completed_sales = Order.objects.filter(farmer=user, status='completed').count()

        profile_data = UserSerializer(user).data
        profile_data['products'] = product_data
        profile_data['completed_sales'] = completed_sales
        profile_data['total_listings'] = products.count()

        return Response(profile_data)


# ────────────────────────────────────────────────────────────
#  Product views
# ────────────────────────────────────────────────────────────
class ProductPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductViewSet(viewsets.ModelViewSet):
    """
    Public catalogue (list/retrieve) plus farmer-owned listing management.

    Query params: commodity, city, market, harvest_date, search, ordering,
    page, page_size, my_listings=true (farmer's own listings, unpaginated).
    """
    serializer_class = ProductSerializer
    pagination_class = ProductPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'commodity']
    ordering_fields = ['created_at', 'listed_price_per_unit', 'harvest_date']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('list', 'retrieve') and not self._wants_my_listings():
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [IsFarmer()]
        if self._wants_my_listings():
            return [IsFarmer()]
        return [IsProductOwnerOrAdmin()]

    def _wants_my_listings(self):
        return self.request.query_params.get('my_listings') == 'true'

    def get_queryset(self):
        queryset = Product.objects.select_related('farmer')

        if self._wants_my_listings():
            queryset = queryset.filter(farmer=self.request.user)
        elif self.action in ('list', 'retrieve'):
            # Marketplace feed: only active listings from approved farmers
            queryset = queryset.filter(is_active=True, farmer__approval_status='approved')
        # update/destroy: all products; ownership is checked per object

        params = self.request.query_params
        if params.get('city'):
            queryset = queryset.filter(farmer__city__icontains=params['city'])
        if params.get('market'):
            queryset = queryset.filter(farmer__market__iexact=params['market'])
        if params.get('commodity'):
            queryset = queryset.filter(commodity__icontains=params['commodity'])
        if params.get('harvest_date'):
            queryset = queryset.filter(harvest_date=params['harvest_date'])

        return queryset

    def paginate_queryset(self, queryset):
        # A farmer's own listings are a short management list; keep it unpaginated.
        if self._wants_my_listings():
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        base_price = serializer.validated_data['base_price_per_unit']
        product = serializer.save(farmer=self.request.user, listed_price_per_unit=listed_price(base_price))
        self._handle_image_uploads(product)

    def perform_update(self, serializer):
        base_price = serializer.validated_data.get(
            'base_price_per_unit', serializer.instance.base_price_per_unit
        )
        product = serializer.save(listed_price_per_unit=listed_price(base_price))
        self._handle_image_uploads(product)

    def _handle_image_uploads(self, product):
        existing = list(product.images or [])
        while len(existing) < 3:
            existing.append(None)

        changed = False
        for idx, key in enumerate(['image1', 'image2', 'image3']):
            if key in self.request.FILES:
                image_file = self.request.FILES[key]
                file_name = default_storage.save(
                    f"product_images/{product.id}_{key}_{image_file.name}", image_file
                )
                # Cloudinary storage returns a full CDN URL; for local dev use absolute URI
                raw_url = default_storage.url(file_name)
                if raw_url.startswith('http'):
                    file_url = raw_url
                elif raw_url.startswith('//'):
                    file_url = 'https:' + raw_url
                else:
                    file_url = self.request.build_absolute_uri(raw_url)
                existing[idx] = file_url
                changed = True

        if changed:
            product.images = [url for url in existing if url]
            product.save()


# ────────────────────────────────────────────────────────────
#  Order views
# ────────────────────────────────────────────────────────────
class OrderViewSet(mixins.ListModelMixin,
                   mixins.RetrieveModelMixin,
                   mixins.CreateModelMixin,
                   viewsets.GenericViewSet):
    """
    Orders are read-only once created. Status changes happen only through the
    payment, admin and driver endpoints.
    """
    serializer_class = OrderSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsBuyer()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):  # schema generation
            return Order.objects.none()
        user = self.request.user
        queryset = Order.objects.select_related('product', 'buyer', 'farmer', 'driver')

        if user.role == 'farmer':
            queryset = queryset.filter(farmer=user)
        elif user.role == 'buyer':
            queryset = queryset.filter(buyer=user)
        elif user.role == 'driver':
            queryset = queryset.filter(driver=user)
        # admin sees all

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']

        with transaction.atomic():
            # Lock the product row so concurrent orders cannot oversell it.
            product = Product.objects.select_for_update().get(pk=product.pk)

            if not product.is_active:
                raise ValidationError({'error': 'This product is no longer available.'})
            if product.quantity <= 0:
                raise ValidationError({'error': 'This product is out of stock.'})
            if product.quantity < quantity:
                raise ValidationError({'error': 'Insufficient stock for this order.'})

            pricing = price_order(product.base_price_per_unit, quantity)

            product.quantity -= quantity
            product.save(update_fields=['quantity'])

            serializer.save(
                buyer=self.request.user,
                farmer=product.farmer,
                product=product,
                total_price=pricing.buyer_total,
                logistics_fee=pricing.logistics_fee,
                platform_fee=pricing.platform_fee,
                farmer_earnings=pricing.farmer_earnings,
                status='pending',
            )


# ────────────────────────────────────────────────────────────
#  Mock M-PESA Payment
# ────────────────────────────────────────────────────────────
class MockPayView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=schema.MockPayRequest, responses={200: schema.MockPayResponse, 400: schema.ErrorResponse, 403: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.buyer != request.user:
            return Response({'error': 'You can only pay for your own orders.'}, status=status.HTTP_403_FORBIDDEN)

        if order.status != 'pending':
            return Response(
                {'error': f'Order is already {order.status}. Only pending orders can be paid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate mock payment ID
        mock_id = f"MOCK_{uuid_lib.uuid4().hex[:10].upper()}"
        order.status = 'paid'
        order.mock_payment_id = mock_id
        order.save()

        return Response({
            'detail': 'Payment successful (mock).',
            'mock_payment_id': mock_id,
            'order': OrderSerializer(order).data
        })


# ────────────────────────────────────────────────────────────
#  Admin views
# ────────────────────────────────────────────────────────────
class AdminDriverManagementView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses=DriverSerializer(many=True))
    def get(self, request):
        drivers = User.objects.filter(role='driver').order_by('-is_driver_active', 'full_name')
        serializer = DriverSerializer(drivers, many=True)
        return Response(serializer.data)

    @extend_schema(request=schema.DriverCreateRequest, responses={201: DriverSerializer, 400: schema.ErrorResponse})
    def post(self, request):
        """Admin creates a new driver user."""
        full_name = request.data.get('full_name')
        phone_number = request.data.get('phone_number')
        vehicle_type = request.data.get('vehicle_type', '')

        if not full_name or not phone_number:
            return Response(
                {'error': 'full_name and phone_number are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        normalized_phone = normalize_ke_phone(phone_number)
        if not normalized_phone:
            return Response({'error': 'Enter a Kenyan mobile number, for example 0712 345 678.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Drivers sign in with a one-time password and must set their own (no shared default).
        email = f"driver_{uuid_lib.uuid4().hex[:8]}@vuna.co.ke"
        driver = User.objects.create_user(
            email=email,
            username=email,
            password=None,
            full_name=full_name,
            role='driver',
            phone_number=normalized_phone,
            vehicle_type=vehicle_type,
            is_driver_active=True,
        )
        one_time_password = issue_one_time_password(driver)

        return Response(
            {**DriverSerializer(driver).data, 'login_email': email, 'one_time_password': one_time_password},
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(request=schema.DriverIdRequest, responses={200: schema.DetailResponse, 404: schema.ErrorResponse})
    def delete(self, request):
        """Admin deactivates a driver."""
        driver_id = request.data.get('driver_id')
        if not driver_id:
            return Response({'error': 'driver_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            driver = User.objects.get(uid=driver_id, role='driver')
        except User.DoesNotExist:
            return Response({'error': 'Driver not found.'}, status=status.HTTP_404_NOT_FOUND)

        driver.is_driver_active = False
        driver.save()
        return Response({'detail': f'Driver {driver.full_name} deactivated.'})


class AdminAssignDriverView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=schema.AssignDriverRequest, responses={200: schema.OrderActionResponse, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request):
        order_id = request.data.get('order_id')
        driver_id = request.data.get('driver_id')

        if not order_id or not driver_id:
            return Response(
                {'error': 'order_id and driver_id are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'paid':
            return Response(
                {'error': f'Order status is "{order.status}". Only paid orders can be assigned a driver.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            driver = User.objects.get(uid=driver_id, role='driver')
        except User.DoesNotExist:
            return Response({'error': 'Driver not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not driver.is_available_driver:
            return Response(
                {'error': f'Driver {driver.full_name} is not available (already assigned or inactive).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Assign
        order.driver = driver
        order.status = 'assigned'
        order.save()

        driver.current_order = order
        driver.save()

        return Response({
            'detail': f'Driver {driver.full_name} assigned to Order #{order.id}.',
            'order': OrderSerializer(order).data
        })


class AdminCompleteOrderView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=schema.OrderIdRequest, responses={200: schema.OrderActionResponse, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({'error': 'order_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'delivered':
            return Response(
                {'error': f'Order status is "{order.status}". Only delivered orders can be completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.farmer_paid = True
        order.status = 'completed'
        order.save()

        # Clear driver assignment
        if order.driver:
            driver = order.driver
            driver.current_order = None
            driver.save()

        return Response({
            'detail': f'Order #{order.id} completed. Farmer marked as paid.',
            'order': OrderSerializer(order).data
        })


class AdminAllOrdersView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(parameters=[schema.STATUS_PARAM], responses=OrderSerializer(many=True))
    def get(self, request):
        queryset = Order.objects.all().order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = OrderSerializer(queryset, many=True)
        return Response(serializer.data)


class AdminUsersView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(parameters=[schema.ROLE_PARAM], responses=UserSerializer(many=True))
    def get(self, request):
        users = User.objects.all().order_by('role', 'full_name')
        role_filter = request.query_params.get('role')
        if role_filter:
            users = users.filter(role=role_filter)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    @extend_schema(request=schema.UserIdRequest, responses={200: schema.DetailResponse, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def delete(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(uid=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == 'admin':
            return Response({'error': 'Cannot delete an admin user.'}, status=status.HTTP_400_BAD_REQUEST)

        name = user.full_name
        user.delete()
        return Response({'detail': f'User {name} deleted.'})


# ────────────────────────────────────────────────────────────
#  Driver views
# ────────────────────────────────────────────────────────────
class DriverOrderView(APIView):
    permission_classes = [IsDriver]

    @extend_schema(responses=schema.DriverOrdersResponse)
    def get(self, request):
        driver = request.user
        current = None
        if driver.current_order:
            current = OrderSerializer(driver.current_order).data

        history = Order.objects.filter(
            driver=driver
        ).exclude(
            id=driver.current_order_id if driver.current_order else -1
        ).order_by('-created_at')

        return Response({
            'current_order': current,
            'history': OrderSerializer(history, many=True).data
        })


class DriverUpdateStatusView(APIView):
    permission_classes = [IsDriver]

    VALID_TRANSITIONS = {
        'assigned': 'collected',
        'collected': 'in_transit',
        'in_transit': 'delivered',
    }

    @extend_schema(request=schema.DriverStatusRequest, responses={200: schema.OrderActionResponse, 400: schema.ErrorResponse})
    def post(self, request):
        new_status = request.data.get('status')
        driver = request.user

        if not driver.current_order:
            return Response(
                {'error': 'You have no current order assigned.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order = driver.current_order
        expected_next = self.VALID_TRANSITIONS.get(order.status)

        if not expected_next:
            return Response(
                {'error': f'Order status "{order.status}" cannot be advanced by driver.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_status != expected_next:
            return Response(
                {'error': f'Invalid transition. Expected next status: "{expected_next}", got "{new_status}".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = new_status
        order.save()

        # If delivered, clear driver assignment
        if new_status == 'delivered':
            driver.current_order = None
            driver.save()

        return Response({
            'detail': f'Order #{order.id} status updated to {new_status}.',
            'order': OrderSerializer(order).data
        })


# ────────────────────────────────────────────────────────────
#  Farmer Earnings
# ────────────────────────────────────────────────────────────
class FarmerEarningsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: schema.FarmerEarningsResponse, 403: schema.ErrorResponse})
    def get(self, request):
        user = request.user
        if user.role != 'farmer':
            return Response({'error': 'Only farmers can check earnings.'}, status=status.HTTP_403_FORBIDDEN)

        completed_orders = Order.objects.filter(farmer=user, status='completed').order_by('-created_at')
        serializer = OrderSerializer(completed_orders, many=True)

        total_earnings = sum((order.farmer_earnings or 0) for order in completed_orders)

        return Response({
            'total_earnings': float(total_earnings),
            'completed_orders': serializer.data
        })


# ────────────────────────────────────────────────────────────
#  Chat views
# ────────────────────────────────────────────────────────────
class ChatMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(parameters=[schema.RECEIVER_PARAM], responses=ChatMessageSerializer(many=True))
    def get(self, request):
        receiver_id = request.query_params.get('receiver_id')
        if not receiver_id:
            return Response({'error': 'receiver_id query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        messages = ChatMessage.objects.filter(
            (Q(sender=request.user) & Q(receiver_id=receiver_id)) |
            (Q(sender_id=receiver_id) & Q(receiver=request.user))
        ).order_by('timestamp')

        # Mark received messages as read
        ChatMessage.objects.filter(sender_id=receiver_id, receiver=request.user, is_read=False).update(is_read=True)

        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @extend_schema(request=schema.SendMessageRequest, responses={201: ChatMessageSerializer, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        message_text = request.data.get('message')
        if not receiver_id or not message_text:
            return Response({'error': 'receiver_id and message are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = User.objects.get(uid=receiver_id)
        except User.DoesNotExist:
            return Response({'error': 'Receiver user not found.'}, status=status.HTTP_404_NOT_FOUND)

        message = ChatMessage.objects.create(
            sender=request.user,
            receiver=receiver,
            message=message_text
        )

        serializer = ChatMessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatInboxView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=schema.ChatInboxItems)
    def get(self, request):
        user = request.user
        sent_users = ChatMessage.objects.filter(sender=user).values_list('receiver_id', flat=True)
        received_users = ChatMessage.objects.filter(receiver=user).values_list('sender_id', flat=True)
        chat_partner_ids = set(list(sent_users) + list(received_users))

        inbox_data = []
        for partner_id in chat_partner_ids:
            try:
                partner = User.objects.get(uid=partner_id)
            except User.DoesNotExist:
                continue

            last_message = ChatMessage.objects.filter(
                (Q(sender=user) & Q(receiver=partner)) |
                (Q(sender=partner) & Q(receiver=user))
            ).order_by('-timestamp').first()

            if last_message:
                inbox_data.append({
                    'partner': UserSerializer(partner).data,
                    'last_message': ChatMessageSerializer(last_message).data
                })

        inbox_data.sort(key=lambda x: x['last_message']['timestamp'], reverse=True)
        return Response(inbox_data)
