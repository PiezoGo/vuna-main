from rest_framework import serializers
from .models import User, Product, Order, ChatMessage


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'uid', 'email', 'full_name', 'role', 'phone_number',
            'country', 'city', 'market', 'bio', 'avatar',
            'buyer_type', 'farmer_delivery_time',
            'vehicle_type', 'is_driver_active', 'current_order',
        ]
        read_only_fields = ['uid']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'full_name', 'role', 'phone_number',
            'country', 'city', 'market',
            'buyer_type', 'farmer_delivery_time',
        ]

    def validate_role(self, value):
        # Public signup can only be farmer or buyer
        if value not in ('farmer', 'buyer'):
            raise serializers.ValidationError("You can only register as a farmer or buyer.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            role=validated_data['role'],
            phone_number=validated_data['phone_number'],
            country=validated_data.get('country', 'Kenya'),
            city=validated_data.get('city', ''),
            market=validated_data.get('market', ''),
            buyer_type=validated_data.get('buyer_type'),
            farmer_delivery_time=validated_data.get('farmer_delivery_time', ''),
        )
        return user


class ProductSerializer(serializers.ModelSerializer):
    farmer_name = serializers.ReadOnlyField(source='farmer.full_name')
    farmer_city = serializers.ReadOnlyField(source='farmer.city')
    farmer_market = serializers.ReadOnlyField(source='farmer.market')
    farmer_phone = serializers.ReadOnlyField(source='farmer.phone_number')
    farmer_uid = serializers.ReadOnlyField(source='farmer.uid')

    class Meta:
        model = Product
        fields = [
            'id', 'farmer', 'farmer_uid', 'farmer_name', 'farmer_city',
            'farmer_market', 'farmer_phone',
            'title', 'commodity', 'unit', 'base_price_per_unit', 'listed_price_per_unit', 'quantity', 'harvest_date',
            'delivery_time_manual', 'delivery_time_varies', 'images',
            'created_at', 'is_active'
        ]
        read_only_fields = ['farmer', 'created_at', 'is_active']


class OrderSerializer(serializers.ModelSerializer):
    product_title = serializers.ReadOnlyField(source='product.title')
    product_unit = serializers.ReadOnlyField(source='product.unit')
    product_base_price = serializers.ReadOnlyField(source='product.base_price_per_unit')
    product_listed_price = serializers.ReadOnlyField(source='product.listed_price_per_unit')
    product_harvest_date = serializers.ReadOnlyField(source='product.harvest_date')
    product_images = serializers.ReadOnlyField(source='product.images')
    buyer_name = serializers.ReadOnlyField(source='buyer.full_name')
    buyer_phone = serializers.ReadOnlyField(source='buyer.phone_number')
    buyer_city = serializers.ReadOnlyField(source='buyer.city')
    farmer_name = serializers.ReadOnlyField(source='farmer.full_name')
    farmer_phone = serializers.ReadOnlyField(source='farmer.phone_number')
    farmer_city = serializers.ReadOnlyField(source='farmer.city')
    driver_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'product', 'product_title', 'product_unit', 'product_base_price', 'product_listed_price',
            'product_harvest_date', 'product_images',
            'buyer', 'buyer_name', 'buyer_phone', 'buyer_city',
            'farmer', 'farmer_name', 'farmer_phone', 'farmer_city',
            'driver', 'driver_name',
            'quantity', 'total_price', 'logistics_fee', 'platform_fee', 'farmer_earnings', 'status',
            'mock_payment_id', 'farmer_paid',
            'created_at'
        ]
        read_only_fields = ['buyer', 'farmer', 'total_price', 'logistics_fee', 'platform_fee', 'farmer_earnings', 'created_at', 'driver']

    def get_driver_name(self, obj):
        if obj.driver:
            return obj.driver.full_name
        return None


class DriverSerializer(serializers.ModelSerializer):
    """Lightweight serializer for admin driver management."""
    current_order_id = serializers.SerializerMethodField()
    current_order_product = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'uid', 'full_name', 'phone_number', 'vehicle_type',
            'is_driver_active', 'current_order',
            'current_order_id', 'current_order_product',
        ]
        read_only_fields = ['uid', 'current_order']

    def get_current_order_id(self, obj):
        if obj.current_order:
            return obj.current_order.id
        return None

    def get_current_order_product(self, obj):
        if obj.current_order:
            return obj.current_order.product.title
        return None


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.full_name')
    receiver_name = serializers.ReadOnlyField(source='receiver.full_name')

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'receiver', 'receiver_name', 'message', 'timestamp', 'is_read']
        read_only_fields = ['sender', 'timestamp', 'is_read']
