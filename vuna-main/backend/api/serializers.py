from django.contrib.auth import password_validation
from decimal import Decimal

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import (
    Call, ChatMessage, Checkout, Cooperative, DeliveryAddress, MpesaPayment, Notification, Order, Problem, Product, Trip,
    User,
)
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
            'cooperative', 'cooperative_name', 'agent', 'is_active', 'date_joined',
        ]
        read_only_fields = [
            'uid', 'role', 'is_driver_active', 'current_order',
            'approval_status', 'rejection_reason', 'must_change_password', 'agent', 'is_active', 'date_joined',
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
    farmer_earnings_per_unit = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'farmer', 'farmer_uid', 'farmer_name', 'farmer_city',
            'farmer_market', 'farmer_phone', 'farmer_cooperative',
            'title', 'commodity', 'unit', 'base_price_per_unit', 'listed_price_per_unit', 'quantity', 'harvest_date',
            'description', 'min_order_quantity',
            'delivery_time_manual', 'delivery_time_varies', 'images',
            'created_at', 'is_active', 'farmer_earnings_per_unit',
        ]
        read_only_fields = ['farmer', 'listed_price_per_unit', 'created_at']
        # Multipart forms (photo uploads) omit unchecked booleans; without a default DRF reads a
        # missing is_active as False and every new listing would start paused.
        extra_kwargs = {'is_active': {'default': True}}

    def validate_base_price_per_unit(self, value):
        if value <= 0:
            raise serializers.ValidationError('Price must be greater than zero.')
        return value

    def get_farmer_earnings_per_unit(self, obj) -> str:
        """What the farmer receives per unit after VUNA's fee (from api/pricing.py)."""
        from .pricing import price_order
        return str(price_order(obj.base_price_per_unit, 1).farmer_earnings)

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
        # The farmer's own price and share are only for the farmer, their agent and admins.
        user = getattr(request, 'user', None)
        is_manager = bool(user and user.is_authenticated and (
            user.role == 'admin' or user.pk == instance.farmer_id
            or (user.role == 'agent' and instance.farmer.agent_id == user.pk)
        ))
        if not is_manager:
            data['base_price_per_unit'] = None
            data['farmer_earnings_per_unit'] = None
        return data


class ProblemSummarySerializer(serializers.ModelSerializer):
    reason_label = serializers.CharField(source='get_reason_display', read_only=True)

    class Meta:
        model = Problem
        fields = ['id', 'reason', 'reason_label', 'description', 'photo', 'status', 'refund_amount', 'admin_note', 'created_at']
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    problem = serializers.SerializerMethodField()
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
    answer_deadline = serializers.SerializerMethodField()
    delivery_date = serializers.DateField(source='checkout.delivery_date', read_only=True, default=None)
    delivery_area = serializers.CharField(source='checkout.area', read_only=True, default=None)
    product_min_order_quantity = serializers.ReadOnlyField(source='product.min_order_quantity')

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
            'created_at',
            'checkout', 'is_paid', 'refunded', 'decided_at', 'answer_deadline',
            'delivery_date', 'delivery_area', 'product_min_order_quantity',
            'trip', 'collected_at', 'delivered_at', 'paid_out_at', 'payout_reference', 'refunded_at',
            'pickup_photo', 'delivery_photo', 'confirmed_at', 'refund_amount', 'payout_deduction', 'problem',
        ]
        read_only_fields = [
            'buyer', 'farmer', 'driver', 'total_price', 'logistics_fee', 'platform_fee',
            'farmer_earnings', 'status', 'mock_payment_id', 'farmer_paid', 'created_at',
            'checkout', 'is_paid', 'refunded', 'decided_at',
            'trip', 'collected_at', 'delivered_at', 'paid_out_at', 'payout_reference', 'refunded_at',
            'pickup_photo', 'delivery_photo', 'confirmed_at', 'refund_amount', 'payout_deduction',
        ]

    @extend_schema_field(ProblemSummarySerializer(allow_null=True))
    def get_problem(self, obj):
        problem = obj.problems.order_by('-created_at').first()
        return ProblemSummarySerializer(problem).data if problem else None

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Quantity must be at least 1.')
        return value

    def get_driver_name(self, obj) -> str | None:
        if obj.driver:
            return obj.driver.full_name
        return None

    def get_answer_deadline(self, obj) -> str | None:
        """When an unanswered checkout line expires (null once answered, or for legacy orders)."""
        if obj.checkout_id is None or obj.status != 'pending':
            return None
        from .checkout import FARMER_ANSWER_WINDOW
        return (obj.created_at + FARMER_ANSWER_WINDOW).isoformat()


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


class DeliveryAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAddress
        fields = ['id', 'label', 'contact_name', 'contact_phone', 'area', 'details', 'landmark', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_contact_phone(self, value):
        return validate_phone(value)


class CartItemSerializer(serializers.Serializer):
    product = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=1_000_000)


class QuoteRequestSerializer(serializers.Serializer):
    items = CartItemSerializer(many=True, allow_empty=False, max_length=50)


class QuoteLineSerializer(serializers.Serializer):
    product = serializers.IntegerField(source='product.id')
    title = serializers.CharField(source='product.title')
    unit = serializers.CharField(source='product.unit')
    farmer_uid = serializers.UUIDField(source='product.farmer.uid')
    farmer_name = serializers.CharField(source='product.farmer.full_name')
    unit_price = serializers.DecimalField(source='product.listed_price_per_unit', max_digits=10, decimal_places=2)
    available = serializers.IntegerField(source='product.quantity')
    min_order_quantity = serializers.IntegerField(source='product.min_order_quantity')
    images = serializers.JSONField(source='product.images')
    quantity = serializers.IntegerField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    error = serializers.CharField(allow_blank=True)


class QuoteSerializer(serializers.Serializer):
    lines = QuoteLineSerializer(many=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    ok = serializers.BooleanField()


class CheckoutCreateSerializer(serializers.Serializer):
    items = CartItemSerializer(many=True, allow_empty=False, max_length=50)
    address = serializers.IntegerField()
    delivery_date = serializers.DateField()
    payment_choice = serializers.ChoiceField(choices=Checkout.PAYMENT_CHOICES)


class CheckoutSerializer(serializers.ModelSerializer):
    lines = OrderSerializer(source='orders', many=True, read_only=True)
    state = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    amount_due = serializers.SerializerMethodField()
    amount_paid = serializers.SerializerMethodField()
    amount_refunded = serializers.SerializerMethodField()
    can_pay = serializers.SerializerMethodField()

    class Meta:
        model = Checkout
        fields = [
            'id', 'payment_choice', 'delivery_date', 'contact_name', 'contact_phone', 'area', 'details',
            'landmark', 'payment_reference', 'paid_at', 'pay_deadline', 'created_at',
            'state', 'total', 'amount_due', 'amount_paid', 'amount_refunded', 'can_pay', 'lines',
        ]
        read_only_fields = fields

    def _orders(self, obj):
        return list(obj.orders.all())

    def get_state(self, obj) -> str:
        from .checkout import checkout_state
        return checkout_state(obj)

    def get_total(self, obj) -> str:
        """Value of the lines still going ahead (not declined, expired or cancelled)."""
        live = [o.total_price for o in self._orders(obj) if o.status not in ('declined', 'expired', 'cancelled')]
        return str(sum(live, Decimal('0')))

    def get_amount_due(self, obj) -> str:
        from .checkout import payable_lines
        return str(sum((o.total_price for o in payable_lines(obj)), Decimal('0')))

    def get_amount_paid(self, obj) -> str:
        return str(sum((o.total_price for o in self._orders(obj) if o.is_paid), Decimal('0')))

    def get_amount_refunded(self, obj) -> str:
        return str(sum((o.total_price for o in self._orders(obj) if o.refunded), Decimal('0')))

    def get_can_pay(self, obj) -> bool:
        from .checkout import payable_lines
        return payable_lines(obj).exists()


class StartPaymentSerializer(serializers.Serializer):
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)


class MpesaPaymentSerializer(serializers.ModelSerializer):
    message = serializers.SerializerMethodField()

    class Meta:
        model = MpesaPayment
        fields = ['id', 'checkout', 'phone', 'amount', 'status', 'simulated', 'receipt_number', 'message', 'created_at']
        read_only_fields = fields

    def get_message(self, obj) -> str:
        from .mpesa import result_message
        if obj.status == 'requested':
            return 'Check your phone and enter your M-Pesa PIN.'
        return result_message(obj.result_code, obj.result_desc)


class AgentFarmerSerializer(serializers.ModelSerializer):
    cooperative_name = serializers.CharField(source='cooperative.name', read_only=True, default=None)
    live_listings = serializers.IntegerField(read_only=True)
    waiting_orders = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'uid', 'full_name', 'phone_number', 'city', 'market', 'cooperative_name', 'approval_status',
            'live_listings', 'waiting_orders',
        ]
        read_only_fields = fields


class FarmerSummarySerializer(serializers.Serializer):
    live_listings = serializers.IntegerField()
    paused_listings = serializers.IntegerField()
    waiting_orders = serializers.IntegerField()
    earnings_due = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_out = serializers.DecimalField(max_digits=12, decimal_places=2)
    earned_this_month = serializers.DecimalField(max_digits=12, decimal_places=2)


class TripStopSerializer(serializers.ModelSerializer):
    """An order line as the driver and admin see it on a trip: pickup and drop-off details."""
    product_title = serializers.ReadOnlyField(source='product.title')
    unit = serializers.ReadOnlyField(source='product.unit')
    farmer_name = serializers.ReadOnlyField(source='farmer.full_name')
    farmer_phone = serializers.ReadOnlyField(source='farmer.phone_number')
    farmer_city = serializers.ReadOnlyField(source='farmer.city')
    farmer_market = serializers.ReadOnlyField(source='farmer.market')
    buyer_name = serializers.ReadOnlyField(source='buyer.full_name')
    contact_name = serializers.CharField(source='checkout.contact_name', read_only=True, default=None)
    contact_phone = serializers.CharField(source='checkout.contact_phone', read_only=True, default=None)
    area = serializers.CharField(source='checkout.area', read_only=True, default=None)
    details = serializers.CharField(source='checkout.details', read_only=True, default=None)
    landmark = serializers.CharField(source='checkout.landmark', read_only=True, default=None)

    class Meta:
        model = Order
        fields = [
            'id', 'stop_order', 'status', 'quantity', 'unit', 'product_title', 'farmer', 'buyer',
            'farmer_name', 'farmer_phone', 'farmer_city', 'farmer_market',
            'buyer_name', 'contact_name', 'contact_phone', 'area', 'details', 'landmark',
            'collected_at', 'delivered_at', 'pickup_photo', 'pickup_condition', 'delivery_photo',
        ]
        read_only_fields = fields


class TripSerializer(serializers.ModelSerializer):
    driver_name = serializers.ReadOnlyField(source='driver.full_name')
    driver_phone = serializers.ReadOnlyField(source='driver.phone_number')
    stops = serializers.SerializerMethodField()
    stop_count = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            'id', 'delivery_date', 'driver', 'driver_name', 'driver_phone', 'status', 'notes', 'created_at',
            'stop_count', 'stops',
        ]
        read_only_fields = fields

    @extend_schema_field(TripStopSerializer(many=True))
    def get_stops(self, obj):
        orders = obj.orders.select_related('product', 'farmer', 'buyer', 'checkout').order_by('stop_order', 'id')
        return TripStopSerializer(orders, many=True).data

    def get_stop_count(self, obj) -> int:
        return obj.orders.count()


class TripCreateSerializer(serializers.Serializer):
    delivery_date = serializers.DateField()
    driver = serializers.UUIDField()
    orders = serializers.ListField(child=serializers.IntegerField(), allow_empty=False, max_length=100)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=255)


class TripOrdersSerializer(serializers.Serializer):
    orders = serializers.ListField(child=serializers.IntegerField(), max_length=100)


class OrderStepSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['collected', 'in_transit', 'delivered', 'completed'])
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)


class ReferenceSerializer(serializers.Serializer):
    reference = serializers.RegexField(r'^[A-Za-z0-9]{6,20}$', error_messages={'invalid': 'Enter the M-Pesa reference, e.g. SKA1B2C3D4.'})


class PayoutLineSerializer(serializers.ModelSerializer):
    product_title = serializers.ReadOnlyField(source='product.title')
    farmer_name = serializers.ReadOnlyField(source='farmer.full_name')
    farmer_phone = serializers.ReadOnlyField(source='farmer.phone_number')
    unit = serializers.ReadOnlyField(source='product.unit')
    due_by = serializers.SerializerMethodField()
    minutes_left = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'product_title', 'quantity', 'unit', 'farmer_name', 'farmer_phone', 'farmer_earnings',
            'status', 'collected_at', 'due_by', 'minutes_left', 'deduction', 'amount_to_send', 'on_hold',
        ]
        read_only_fields = fields

    deduction = serializers.SerializerMethodField(help_text="Farmer-fault refunds taken off this payout")
    amount_to_send = serializers.SerializerMethodField()
    on_hold = serializers.SerializerMethodField(help_text='The buyer reported a problem on this line')

    def get_deduction(self, obj) -> Decimal:
        return getattr(obj, 'deduction', Decimal('0.00'))

    def get_amount_to_send(self, obj) -> Decimal:
        return (obj.farmer_earnings or Decimal('0')) - getattr(obj, 'deduction', Decimal('0'))

    def get_on_hold(self, obj) -> bool:
        return getattr(obj, 'on_hold', False)

    def _due(self, obj):
        from datetime import timedelta
        from .fulfilment import PAYOUT_PROMISE_HOURS
        return obj.collected_at + timedelta(hours=PAYOUT_PROMISE_HOURS) if obj.collected_at else None

    def get_due_by(self, obj) -> str | None:
        due = self._due(obj)
        return due.isoformat() if due else None

    def get_minutes_left(self, obj) -> int | None:
        """Minutes until the 4-hour promise; negative once overdue."""
        from django.utils import timezone
        due = self._due(obj)
        return int((due - timezone.now()).total_seconds() // 60) if due else None


class RefundLineSerializer(serializers.ModelSerializer):
    product_title = serializers.ReadOnlyField(source='product.title')
    buyer_name = serializers.ReadOnlyField(source='buyer.full_name')
    buyer_phone = serializers.ReadOnlyField(source='buyer.phone_number')
    payment_reference = serializers.ReadOnlyField(source='mock_payment_id')
    amount = serializers.SerializerMethodField(help_text='What to send back: the decided refund, or the whole line')
    reason = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'product_title', 'quantity', 'buyer_name', 'buyer_phone', 'total_price', 'amount', 'reason',
            'status', 'payment_reference', 'created_at',
        ]
        read_only_fields = fields

    def get_amount(self, obj) -> Decimal:
        return obj.refund_amount if obj.refund_amount is not None else obj.total_price

    def get_reason(self, obj) -> str:
        return 'Problem reported after delivery' if obj.refund_amount is not None else f'Line {obj.get_status_display().lower()}'


class AdminOverviewSerializer(serializers.Serializer):
    waiting_for_farmers = serializers.IntegerField()
    awaiting_payment = serializers.IntegerField()
    paid_without_trip = serializers.IntegerField()
    trips_today = serializers.IntegerField()
    payouts_due = serializers.IntegerField()
    payouts_overdue = serializers.IntegerField()
    refunds_to_send = serializers.IntegerField()
    pending_farmers = serializers.IntegerField()
    week_gmv = serializers.DecimalField(max_digits=14, decimal_places=2)
    week_orders = serializers.IntegerField()
    problems_open = serializers.IntegerField()
    unconfirmed_over_24h = serializers.IntegerField()


class AgentLinkSerializer(serializers.Serializer):
    agent = serializers.UUIDField(allow_null=True)


class UserActiveSerializer(serializers.Serializer):
    active = serializers.BooleanField()


class CollectSerializer(serializers.Serializer):
    photo = serializers.FileField()
    condition = serializers.ChoiceField(choices=['good', 'issue'])
    note = serializers.CharField(required=False, allow_blank=True, max_length=255)


class DeliverSerializer(serializers.Serializer):
    photo = serializers.FileField()


class ProblemCreateSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=[c[0] for c in Problem.REASON_CHOICES])
    description = serializers.CharField(min_length=5, max_length=1000)
    photo = serializers.FileField()


class ProblemSerializer(serializers.ModelSerializer):
    """A problem report as admins see it, with the line's amounts."""
    reason_label = serializers.CharField(source='get_reason_display', read_only=True)
    buyer_name = serializers.ReadOnlyField(source='buyer.full_name')
    buyer_phone = serializers.ReadOnlyField(source='buyer.phone_number')
    farmer_name = serializers.ReadOnlyField(source='order.farmer.full_name')
    product_title = serializers.ReadOnlyField(source='order.product.title')
    quantity = serializers.ReadOnlyField(source='order.quantity')
    unit = serializers.ReadOnlyField(source='order.product.unit')
    total_price = serializers.DecimalField(source='order.total_price', max_digits=12, decimal_places=2, read_only=True)
    farmer_earnings = serializers.DecimalField(source='order.farmer_earnings', max_digits=12, decimal_places=2, read_only=True)
    farmer_paid = serializers.ReadOnlyField(source='order.farmer_paid')
    delivery_photo = serializers.ReadOnlyField(source='order.delivery_photo')
    pickup_photo = serializers.ReadOnlyField(source='order.pickup_photo')
    decided_by_name = serializers.CharField(source='decided_by.full_name', read_only=True, default=None)

    class Meta:
        model = Problem
        fields = [
            'id', 'order', 'reason', 'reason_label', 'description', 'photo', 'status', 'fault',
            'refund_amount', 'farmer_deduction', 'admin_note', 'decided_by_name', 'decided_at', 'created_at',
            'buyer_name', 'buyer_phone', 'farmer_name', 'product_title', 'quantity', 'unit',
            'total_price', 'farmer_earnings', 'farmer_paid', 'delivery_photo', 'pickup_photo',
        ]
        read_only_fields = fields


class ProblemDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['refund', 'reject'])
    fault = serializers.ChoiceField(choices=['farmer', 'vuna'], required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True,
                                      help_text='Refund amount; empty = the whole line')
    note = serializers.CharField(max_length=255)

    def validate(self, attrs):
        if attrs['decision'] == 'refund' and not attrs.get('fault'):
            raise serializers.ValidationError({'fault': ['Say whose fault it was.']})
        return attrs


class DeliveryMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.full_name')
    sender_role = serializers.ReadOnlyField(source='sender.role')

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'sender_role', 'message', 'timestamp', 'is_read']
        read_only_fields = fields


class DeliveryMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'kind', 'title', 'body', 'link', 'read_at', 'created_at']
        read_only_fields = fields


class BadgeSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    urgent = serializers.BooleanField()


class NotificationSummarySerializer(serializers.Serializer):
    badges = serializers.DictField(child=BadgeSerializer(), help_text='Keyed by the sidebar link, e.g. "/farmer/orders"')
    unread = serializers.IntegerField(help_text='Unread bell items')
    messages = serializers.IntegerField(help_text='Unread chat messages')


class ReadIdsSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), required=False, max_length=200)


class RealtimeTicketSerializer(serializers.Serializer):
    ticket = serializers.CharField(help_text='One-time, valid 60 seconds: wss://<backend>/ws/?ticket=…')


class ChatPartnerSerializer(serializers.ModelSerializer):
    """Who you're talking to: no email, no account flags."""
    class Meta:
        model = User
        fields = ['uid', 'full_name', 'role', 'city', 'avatar']
        read_only_fields = fields


class ChatLineSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.full_name')

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'receiver', 'message', 'order', 'timestamp', 'is_read']
        read_only_fields = fields


class InboxItemSerializer(serializers.Serializer):
    partner = ChatPartnerSerializer()
    last_message = ChatLineSerializer()
    unread = serializers.IntegerField()


class ConversationSerializer(serializers.Serializer):
    partner = ChatPartnerSerializer()
    can_send = serializers.BooleanField()
    messages = ChatLineSerializer(many=True)


class ChatSendSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, trim_whitespace=True)


class CallPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['uid', 'full_name', 'role']
        read_only_fields = fields


class CallSerializer(serializers.ModelSerializer):
    caller = CallPersonSerializer(read_only=True)
    callee = CallPersonSerializer(read_only=True)

    class Meta:
        model = Call
        fields = ['id', 'kind', 'status', 'caller', 'callee', 'order', 'created_at', 'answered_at', 'ended_at']
        read_only_fields = fields


class CallStartSerializer(serializers.Serializer):
    callee = serializers.UUIDField()
    kind = serializers.ChoiceField(choices=['audio', 'video'], default='audio')
    order = serializers.IntegerField(required=False, allow_null=True)


class CallJoinSerializer(serializers.Serializer):
    """What the browser needs to join the LiveKit room. The token is for this person and this room only."""
    call = CallSerializer()
    url = serializers.CharField()
    token = serializers.CharField()
    callee_online = serializers.BooleanField()


class CallCheckSerializer(serializers.Serializer):
    enabled = serializers.BooleanField(help_text='Calls are set up (LiveKit settings present)')
    allowed = serializers.BooleanField(help_text='You may call this person')
    online = serializers.BooleanField(help_text='They have the site open (it can ring)')
