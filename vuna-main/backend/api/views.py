import uuid as uuid_lib
from decimal import Decimal

from django.db.models import Q
from django.core.files.storage import default_storage
from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate

from .models import User, Product, Order, ChatMessage
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ProductSerializer,
    OrderSerializer,
    DriverSerializer,
    ChatMessageSerializer,
)


# ────────────────────────────────────────────────────────────
#  Permission helpers
# ────────────────────────────────────────────────────────────
class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsDriver(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'driver'


# ────────────────────────────────────────────────────────────
#  Auth views
# ────────────────────────────────────────────────────────────
class RegisterView(APIView):
    permission_classes = []

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

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PublicProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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
class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Product.objects.all()
        my_listings = self.request.query_params.get('my_listings')

        if my_listings == 'true':
            queryset = queryset.filter(farmer=self.request.user)
        else:
            # Marketplace feed: only show active listings
            queryset = queryset.filter(is_active=True)

        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(farmer__city__icontains=city)

        commodity = self.request.query_params.get('commodity')
        if commodity:
            queryset = queryset.filter(commodity__icontains=commodity)

        harvest_date = self.request.query_params.get('harvest_date')
        if harvest_date:
            queryset = queryset.filter(harvest_date=harvest_date)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        base_price = Decimal(self.request.data.get('base_price_per_unit', 0))
        listed_price = base_price * Decimal('1.20')
        product = serializer.save(farmer=self.request.user, listed_price_per_unit=listed_price)
        self._handle_image_uploads(product)

    def perform_update(self, serializer):
        base_price = Decimal(self.request.data.get('base_price_per_unit', serializer.instance.base_price_per_unit))
        listed_price = base_price * Decimal('1.20')
        product = serializer.save(listed_price_per_unit=listed_price)
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
class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.all()

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
        product_id = self.request.data.get('product')
        quantity = int(self.request.data.get('quantity', 1))

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise ValidationError({"product": "Product does not exist."})

        if product.quantity <= 0:
            raise ValidationError({"error": "This product is out of stock."})
        if product.quantity < quantity:
            raise ValidationError({"error": "Insufficient stock for this order."})

        listed = product.listed_price_per_unit or (product.base_price_per_unit * Decimal('1.20'))
        buyer_total = listed * quantity * Decimal('1.08')
        logistics_fee = product.base_price_per_unit * quantity * Decimal('0.20')
        platform_fee = listed * quantity * Decimal('0.08')
        farmer_earnings = product.base_price_per_unit * quantity * Decimal('0.92')

        # Deduct stock immediately when order is placed
        product.quantity -= quantity
        product.save()

        serializer.save(
            buyer=self.request.user,
            farmer=product.farmer,
            product=product,
            total_price=buyer_total,
            logistics_fee=logistics_fee,
            platform_fee=platform_fee,
            farmer_earnings=farmer_earnings,
            status='pending'
        )


# ────────────────────────────────────────────────────────────
#  Mock M-PESA Payment
# ────────────────────────────────────────────────────────────
class MockPayView(APIView):
    permission_classes = [permissions.IsAuthenticated]

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

    def get(self, request):
        drivers = User.objects.filter(role='driver').order_by('-is_driver_active', 'full_name')
        serializer = DriverSerializer(drivers, many=True)
        return Response(serializer.data)

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

        # Create driver user with a default password
        email = f"driver_{uuid_lib.uuid4().hex[:6]}@vuna.co.ke"
        driver = User.objects.create_user(
            email=email,
            username=email,
            password='driver123',
            full_name=full_name,
            role='driver',
            phone_number=phone_number,
            vehicle_type=vehicle_type,
            is_driver_active=True,
        )

        return Response(DriverSerializer(driver).data, status=status.HTTP_201_CREATED)

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

    def get(self, request):
        queryset = Order.objects.all().order_by('-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = OrderSerializer(queryset, many=True)
        return Response(serializer.data)


class AdminUsersView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.all().order_by('role', 'full_name')
        role_filter = request.query_params.get('role')
        if role_filter:
            users = users.filter(role=role_filter)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

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
