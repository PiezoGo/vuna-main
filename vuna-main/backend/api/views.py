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
    ChatMessageSerializer
)

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

        # Filters by city
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(farmer__city__icontains=city)

        # Filters by commodity
        commodity = self.request.query_params.get('commodity')
        if commodity:
            queryset = queryset.filter(commodity__icontains=commodity)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        product = serializer.save(farmer=self.request.user)
        self._handle_image_uploads(product)

    def perform_update(self, serializer):
        product = serializer.save()
        self._handle_image_uploads(product)

    def _handle_image_uploads(self, product):
        uploaded_images = []
        for key in ['image1', 'image2', 'image3']:
            if key in self.request.FILES:
                image_file = self.request.FILES[key]
                file_name = default_storage.save(f"product_images/{product.id}_{key}_{image_file.name}", image_file)
                file_url = self.request.build_absolute_uri(default_storage.url(file_name))
                uploaded_images.append(file_url)
        
        if uploaded_images:
            product.images = uploaded_images
            product.save()


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
        else:  # role == 'both'
            queryset = queryset.filter(Q(buyer=user) | Q(farmer=user))
        
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

        total_price = product.price_per_unit * quantity
        serializer.save(
            buyer=self.request.user,
            farmer=product.farmer,
            product=product,
            total_price=total_price,
            status='pending'
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        new_status = request.data.get('status')
        current = instance.status

        if new_status:
            if new_status == 'delivery_in_progress':
                if request.user != instance.farmer:
                    return Response({'error': 'Only the seller can start delivery.'}, status=status.HTTP_403_FORBIDDEN)
                if current != 'pending':
                    return Response({'error': 'Only pending orders can be moved to delivery in progress.'}, status=status.HTTP_400_BAD_REQUEST)
                product = instance.product
                if product.quantity < instance.quantity:
                    return Response({'error': 'Insufficient stock to fulfill this order.'}, status=status.HTTP_400_BAD_REQUEST)
                product.quantity -= instance.quantity
                product.save()

            elif new_status == 'delivered':
                if request.user == instance.farmer:
                    if current not in ['delivery_in_progress', 'disputed']:
                        return Response({'error': 'Order must be in delivery or disputed before marking delivered.'}, status=status.HTTP_400_BAD_REQUEST)
                elif request.user == instance.buyer:
                    if current != 'disputed':
                        return Response({'error': 'Only disputed orders can be marked complete by the buyer.'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({'error': 'Not authorized to update this order.'}, status=status.HTTP_403_FORBIDDEN)

            elif new_status == 'disputed':
                if request.user != instance.buyer:
                    return Response({'error': 'Only the buyer can dispute the order.'}, status=status.HTTP_403_FORBIDDEN)
                if current != 'delivery_in_progress':
                    return Response({'error': 'Only orders in delivery can be disputed.'}, status=status.HTTP_400_BAD_REQUEST)

            elif new_status == 'completed':
                if request.user != instance.buyer:
                    return Response({'error': 'Only the buyer can complete the order.'}, status=status.HTTP_403_FORBIDDEN)
                if current != 'delivered':
                    return Response({'error': 'Order must be delivered before completion.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


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


class FarmerEarningsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in ['farmer', 'both']:
            return Response({'error': 'Only farmers can check earnings.'}, status=status.HTTP_403_FORBIDDEN)
        
        completed_orders = Order.objects.filter(farmer=user, status='completed').order_by('-created_at')
        serializer = OrderSerializer(completed_orders, many=True)
        
        total_earnings = sum(order.total_price for order in completed_orders)
        
        return Response({
            'total_earnings': float(total_earnings),
            'completed_orders': serializer.data
        })


class ProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

