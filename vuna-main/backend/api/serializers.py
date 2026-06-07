from rest_framework import serializers
from .models import User, Product, Order, ChatMessage

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['uid', 'email', 'full_name', 'role', 'phone_number', 'country', 'city', 'market', 'bio', 'avatar']
        read_only_fields = ['uid']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'full_name', 'role', 'phone_number', 'country', 'city', 'market']

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            role=validated_data['role'],
            phone_number=validated_data['phone_number'],
            country=validated_data.get('country', 'Kenya'),
            city=validated_data['city'],
            market=validated_data['market']
        )
        return user


class ProductSerializer(serializers.ModelSerializer):
    farmer_name = serializers.ReadOnlyField(source='farmer.full_name')
    farmer_city = serializers.ReadOnlyField(source='farmer.city')
    farmer_market = serializers.ReadOnlyField(source='farmer.market')
    farmer_phone = serializers.ReadOnlyField(source='farmer.phone_number')

    class Meta:
        model = Product
        fields = [
            'id', 'farmer', 'farmer_name', 'farmer_city', 'farmer_market', 'farmer_phone',
            'title', 'commodity', 'unit', 'price_per_unit', 'quantity',
            'delivery_time_manual', 'delivery_time_varies', 'images', 'created_at', 'is_active'
        ]
        read_only_fields = ['farmer', 'created_at', 'is_active']


class OrderSerializer(serializers.ModelSerializer):
    product_title = serializers.ReadOnlyField(source='product.title')
    product_unit = serializers.ReadOnlyField(source='product.unit')
    product_price = serializers.ReadOnlyField(source='product.price_per_unit')
    buyer_name = serializers.ReadOnlyField(source='buyer.full_name')
    buyer_phone = serializers.ReadOnlyField(source='buyer.phone_number')
    farmer_name = serializers.ReadOnlyField(source='farmer.full_name')
    farmer_phone = serializers.ReadOnlyField(source='farmer.phone_number')

    class Meta:
        model = Order
        fields = [
            'id', 'product', 'product_title', 'product_unit', 'product_price',
            'buyer', 'buyer_name', 'buyer_phone', 'farmer', 'farmer_name', 'farmer_phone',
            'quantity', 'total_price', 'status', 'created_at'
        ]
        read_only_fields = ['buyer', 'farmer', 'total_price', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.full_name')
    receiver_name = serializers.ReadOnlyField(source='receiver.full_name')

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'message', 'timestamp', 'is_read']
        read_only_fields = ['sender', 'timestamp', 'is_read']
