from django.contrib.auth import password_validation
from rest_framework import serializers
from .models import ChatMessage, Cooperative, Order, Product, User
from .phone import normalize_ke_phone


def validate_phone(value):
    normalized = normalize_ke_phone(value)
    if not normalized:
        raise serializers.ValidationError('Enter a Kenyan mobile number, for example 0712 345 678.')
    return normalized


class CooperativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cooperative
        fields = ['id', 'name', 'county']


class UserSerializer(serializers.ModelSerializer):
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            'uid', 'email', 'full_name', 'role', 'phone_number',
            'country', 'city', 'market', 'bio', 'avatar',
            'buyer_type', 'farmer_delivery_time',
            'vehicle_type', 'is_driver_active', 'current_order',
            'approval_status', 'rejection_reason', 'must_change_password',
            'cooperative', 'cooperative_name', 'agent',
        ]
        read_only_fields = [
            'uid', 'role', 'is_driver_active', 'current_order',
            'approval_status', 'rejection_reason', 'must_change_password', 'agent',
        ]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Fields a user may change on their own profile. Role and driver state are admin-only."""

    class Meta:
        model = User
        fields = [
            'full_name', 'phone_number', 'country', 'city', 'market', 'bio', 'avatar',
            'buyer_type', 'farmer_delivery_time', 'vehicle_type', 'cooperative',
        ]

    def validate_phone_number(self, value):
        return validate_phone(value)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'full_name', 'role', 'phone_number',
            'country', 'city', 'market',
            'buyer_type', 'farmer_delivery_time', 'cooperative',
        ]
        extra_kwargs = {'cooperative': {'required': False, 'allow_null': True}}

    def validate_phone_number(self, value):
        return validate_phone(value)

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def validate(self, attrs):
        if attrs.get('role') == 'buyer' and not attrs.get('buyer_type'):
            raise serializers.ValidationError({'buyer_type': 'Choose your business type.'})
        if attrs.get('role') != 'farmer':
            attrs.pop('cooperative', None)
        return attrs

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
            cooperative=validated_data.get('cooperative'),
            # New farmers wait for admin approval before their listings go live.
            approval_status='pending' if validated_data['role'] == 'farmer' else 'approved',
        )
        return user


class ProductSerializer(serializers.ModelSerializer):
    farmer_name = serializers.ReadOnlyField(source='farmer.full_name')
    farmer_city = serializers.ReadOnlyField(source='farmer.city')
    farmer_market = serializers.ReadOnlyField(source='farmer.market')
    farmer_phone = serializers.ReadOnlyField(source='farmer.phone_number')
    farmer_uid = serializers.ReadOnlyField(source='farmer.uid')
    farmer_cooperative = serializers.CharField(source='farmer.cooperative.name', read_only=True, default=None)

    class Meta:
        model = Product
        fields = [
            'id', 'farmer', 'farmer_uid', 'farmer_name', 'farmer_city',
            'farmer_market', 'farmer_phone', 'farmer_cooperative',
            'title', 'commodity', 'unit', 'base_price_per_unit', 'listed_price_per_unit', 'quantity', 'harvest_date',
            'description', 'min_order_quantity',
            'delivery_time_manual', 'delivery_time_varies', 'images',
            'created_at', 'is_active'
        ]
        read_only_fields = ['farmer', 'listed_price_per_unit', 'created_at', 'is_active']

    def validate_base_price_per_unit(self, value):
        if value <= 0:
            raise serializers.ValidationError('Price must be greater than zero.')
        return value

    def validate_min_order_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('The minimum order must be at least 1.')
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        # Contact details are only for signed-in users (the catalogue is public).
        if not (request and request.user and request.user.is_authenticated):
            data['farmer_phone'] = None
        return data


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
        read_only_fields = [
            'buyer', 'farmer', 'driver', 'total_price', 'logistics_fee', 'platform_fee',
            'farmer_earnings', 'status', 'mock_payment_id', 'farmer_paid', 'created_at',
        ]

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        return value

    def get_driver_name(self, obj) -> str | None:
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

    def get_current_order_id(self, obj) -> int | None:
        if obj.current_order:
            return obj.current_order.id
        return None

    def get_current_order_product(self, obj) -> str | None:
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


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Your current password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': 'Choose a password different from the current one.'})
        password_validation.validate_password(attrs['new_password'], self.context['request'].user)
        return attrs


class StaffCreateSerializer(serializers.Serializer):
    """Admin creates a driver or field agent; they sign in with a one-time password."""
    role = serializers.ChoiceField(choices=['driver', 'agent'])
    full_name = serializers.CharField(max_length=255)
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    vehicle_type = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_phone_number(self, value):
        return validate_phone(value)

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value


class FarmerApprovalSerializer(serializers.ModelSerializer):
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True, default=None)
    listings = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'uid', 'full_name', 'email', 'phone_number', 'city', 'market',
            'cooperative_name', 'approval_status', 'rejection_reason', 'date_joined', 'listings',
        ]
        read_only_fields = fields


class RejectFarmerSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=255)


class FarmerProfileSerializer(serializers.ModelSerializer):
    """What a signed-in user may see about another user: no email, no account flags."""
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            'uid', 'full_name', 'role', 'phone_number', 'city', 'market', 'bio', 'avatar',
            'cooperative_name', 'date_joined',
        ]
        read_only_fields = fields


class FacetValueSerializer(serializers.Serializer):
    value = serializers.CharField()
    count = serializers.IntegerField()


class ProductFacetsSerializer(serializers.Serializer):
    commodities = FacetValueSerializer(many=True)
    cities = FacetValueSerializer(many=True)
    markets = FacetValueSerializer(many=True)
