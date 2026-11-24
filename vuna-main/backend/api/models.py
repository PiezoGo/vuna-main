import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class Cooperative(models.Model):
    """A farmer cooperative or cluster (e.g. Limuru). Managed by admins."""
    name = models.CharField(max_length=120, unique=True)
    county = models.CharField(max_length=100, blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = [
        ('farmer', 'Farmer'),
        ('buyer', 'Buyer'),
        ('admin', 'Admin'),
        ('driver', 'Driver'),
        ('agent', 'Field agent'),
    ]
    APPROVAL_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    MARKET_CHOICES = [
        ('Muthurwa', 'Muthurwa'),
        ('Wakulima', 'Wakulima'),
        ('Marikiti', 'Marikiti'),
        ('Other', 'Other'),
    ]
    BUYER_TYPE_CHOICES = [
        ('hotel', 'Hotel'),
        ('retailer', 'Retailer'),
        ('wholesaler', 'Wholesaler'),
    ]

    uid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    phone_number = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='Kenya')
    city = models.CharField(max_length=100, blank=True, default='')
    market = models.CharField(max_length=100, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    avatar = models.CharField(max_length=255, blank=True, default='')

    # Approval: new farmers start 'pending'; every other role is 'approved'.
    approval_status = models.CharField(max_length=10, choices=APPROVAL_CHOICES, default='approved')
    rejection_reason = models.CharField(max_length=255, blank=True, default='')
    # Set when an admin issues a one-time password; cleared when the user sets their own.
    must_change_password = models.BooleanField(default=False)

    # Farmer links
    cooperative = models.ForeignKey(
        Cooperative, on_delete=models.SET_NULL, null=True, blank=True, related_name='farmers'
    )
    agent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='agent_farmers',
        limit_choices_to={'role': 'agent'},
    )

    # Buyer-specific fields
    buyer_type = models.CharField(max_length=20, choices=BUYER_TYPE_CHOICES, blank=True, null=True)

    # Farmer-specific fields
    farmer_delivery_time = models.CharField(max_length=100, blank=True, default='')

    # Driver-specific fields
    vehicle_type = models.CharField(max_length=100, blank=True, default='')
    is_driver_active = models.BooleanField(default=True)
    current_order = models.OneToOneField(
        'Order', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_driver_user'
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.role})"

    @property
    def is_approved(self):
        return self.approval_status == 'approved'

    @property
    def is_available_driver(self):
        """Returns True if this is an active driver with no current assignment."""
        return self.role == 'driver' and self.is_driver_active and self.current_order is None


class Product(models.Model):
    UNIT_CHOICES = [
        ('kg', 'kg'),
        ('sack', 'sack'),
        ('piece', 'piece'),
        ('bunch', 'bunch'),
        ('litre', 'litre'),
    ]

    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products')
    # Who typed it in: the farmer, or a field agent acting for them.
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='products_created',
    )
    title = models.CharField(max_length=255)
    commodity = models.CharField(max_length=100, blank=True, null=True)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    base_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    listed_price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    quantity = models.PositiveIntegerField()
    harvest_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, default='')
    # Smallest quantity a buyer may order, in this product's unit.
    min_order_quantity = models.PositiveIntegerField(default=1)
    delivery_time_manual = models.PositiveIntegerField(blank=True, null=True)
    delivery_time_varies = models.BooleanField(default=False)
    images = models.JSONField(default=list, blank=True)  # List of image URLs
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    # Removed by the farmer: kept (orders point at it) but hidden from their list.
    archived = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class DeliveryAddress(models.Model):
    """A buyer's saved delivery address."""
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=60, help_text='e.g. "Main kitchen"')
    contact_name = models.CharField(max_length=120)
    contact_phone = models.CharField(max_length=20)
    area = models.CharField(max_length=120, help_text='Town or neighbourhood')
    details = models.CharField(max_length=255, help_text='Building, street, gate')
    landmark = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.label} ({self.buyer.full_name})'


class Checkout(models.Model):
    """One buyer cart turned into orders: one Order per product line, paid with one M-Pesa payment."""
    PAYMENT_CHOICES = [
        ('pay_now', 'Pay now'),
        ('pay_after', 'Pay after farmers confirm'),
    ]

    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='checkouts')
    payment_choice = models.CharField(max_length=10, choices=PAYMENT_CHOICES)
    delivery_date = models.DateField()
    # Address snapshot: later edits to a saved address don't change past orders.
    contact_name = models.CharField(max_length=120)
    contact_phone = models.CharField(max_length=20)
    area = models.CharField(max_length=120)
    details = models.CharField(max_length=255)
    landmark = models.CharField(max_length=255, blank=True, default='')
    payment_reference = models.CharField(max_length=50, blank=True, default='')
    paid_at = models.DateTimeField(null=True, blank=True)
    # Set once every farmer has answered: unpaid accepted lines expire after it.
    pay_deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Checkout #{self.id} ({self.buyer.full_name})'


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Waiting for farmer'),
        ('accepted', 'Accepted, awaiting payment'),
        ('declined', 'Declined by farmer'),
        ('expired', 'Expired'),
        ('paid', 'Paid'),
        ('assigned', 'Assigned'),
        ('collected', 'Collected'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='orders')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='buyer_orders')
    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='farmer_orders')
    driver = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='driver_orders', limit_choices_to={'role': 'driver'}
    )
    quantity = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=12, decimal_places=2)  # This is the buyer_total
    logistics_fee = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    farmer_earnings = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    mock_payment_id = models.CharField(max_length=50, blank=True, null=True)
    farmer_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Cart checkout flow (null for orders created by the legacy site)
    checkout = models.ForeignKey(Checkout, on_delete=models.CASCADE, null=True, blank=True, related_name='orders')
    # Payment is tracked apart from status: a "pay now" line is paid while still waiting for the farmer.
    is_paid = models.BooleanField(default=False)
    refunded = models.BooleanField(default=False)
    decided_at = models.DateTimeField(null=True, blank=True)

    # Delivery and money after payment (Module 8)
    trip = models.ForeignKey('Trip', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    stop_order = models.PositiveIntegerField(default=0)
    collected_at = models.DateTimeField(null=True, blank=True)  # starts the 4-hour payout promise
    delivered_at = models.DateTimeField(null=True, blank=True)
    payout_reference = models.CharField(max_length=32, blank=True, default='')
    paid_out_at = models.DateTimeField(null=True, blank=True)
    refund_reference = models.CharField(max_length=32, blank=True, default='')
    refunded_at = models.DateTimeField(null=True, blank=True)

    # Delivery proof and confirmation (Module 9)
    pickup_photo = models.URLField(max_length=500, blank=True, default='')
    pickup_condition = models.CharField(max_length=10, blank=True, default='', choices=[('good', 'Good'), ('issue', 'Issue')])
    pickup_note = models.CharField(max_length=255, blank=True, default='')
    delivery_photo = models.URLField(max_length=500, blank=True, default='')
    confirmed_at = models.DateTimeField(null=True, blank=True)  # buyer confirmed receipt
    # Partial or full refund decided on a problem report (null = none, or the whole line when `refunded`).
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    # Farmer-fault refunds taken off this payout when it was recorded.
    payout_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"Order #{self.id} - {self.product.title} ({self.status})"


class Trip(models.Model):
    """One driver's delivery run on one date: farm pickups, then buyer drop-offs."""
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'On the road'),
        ('done', 'Done'),
        ('cancelled', 'Cancelled'),
    ]

    delivery_date = models.DateField()
    driver = models.ForeignKey(User, on_delete=models.PROTECT, related_name='trips', limit_choices_to={'role': 'driver'})
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='planned')
    notes = models.CharField(max_length=255, blank=True, default='')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='trips_created')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-delivery_date', 'id']

    def __str__(self):
        return f'Trip #{self.id} {self.delivery_date} ({self.driver.full_name})'


class OrderEvent(models.Model):
    """Audit trail: every status change on an order line, who made it and when."""
    order = models.ForeignKey('Order', on_delete=models.CASCADE, related_name='events')
    status = models.CharField(max_length=20)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_events')
    note = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class Problem(models.Model):
    """A buyer's report that a delivered line was wrong; an admin decides the refund."""
    REASON_CHOICES = [
        ('quality', 'Poor quality'),
        ('quantity', 'Wrong quantity'),
        ('wrong_item', 'Wrong item'),
        ('damaged', 'Damaged'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [('open', 'Open'), ('refunded', 'Refunded'), ('rejected', 'Rejected')]
    FAULT_CHOICES = [('farmer', 'Farmer'), ('vuna', 'VUNA')]

    order = models.ForeignKey('Order', on_delete=models.CASCADE, related_name='problems')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='problems')
    reason = models.CharField(max_length=12, choices=REASON_CHOICES)
    description = models.TextField(max_length=1000)
    photo = models.URLField(max_length=500)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    fault = models.CharField(max_length=10, choices=FAULT_CHOICES, blank=True, default='')
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    # Farmer-fault only: the farmer's share of the refund, taken off their next payout.
    farmer_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deducted_on = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='deductions')
    admin_note = models.CharField(max_length=255, blank=True, default='')
    decided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='problems_decided')
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class Notification(models.Model):
    """A bell item: something that happened that this user should know about (Module 10)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    kind = models.CharField(max_length=40)
    title = models.CharField(max_length=140)
    body = models.CharField(max_length=255, blank=True, default='')
    link = models.CharField(max_length=200, blank=True, default='')  # a site path, e.g. /orders/12
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', 'read_at'])]


class Call(models.Model):
    """An in-app audio/video call between two people (Module 11). Media goes through LiveKit."""
    KIND_CHOICES = [('audio', 'Audio'), ('video', 'Video')]
    STATUS_CHOICES = [
        ('ringing', 'Ringing'),
        ('answered', 'Answered'),
        ('declined', 'Declined'),
        ('missed', 'Missed'),
        ('ended', 'Ended'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    caller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_made')
    callee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_received')
    kind = models.CharField(max_length=5, choices=KIND_CHOICES, default='audio')
    order = models.ForeignKey('Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='calls')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ringing')
    created_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['callee', 'status']), models.Index(fields=['status', 'created_at'])]

    @property
    def room(self) -> str:
        return f'call-{self.id.hex}'


class MpesaPayment(models.Model):
    """One M-Pesa Express (STK Push) prompt for a checkout."""
    STATUS_CHOICES = [
        ('requested', 'Waiting for the buyer'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]

    checkout = models.ForeignKey(Checkout, on_delete=models.CASCADE, related_name='payments')
    # The order lines this payment covers, fixed when the prompt is sent.
    orders = models.ManyToManyField(Order, related_name='payments')
    phone = models.CharField(max_length=20)
    amount = models.PositiveIntegerField(help_text='Whole shillings sent to M-Pesa')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='requested')
    simulated = models.BooleanField(default=False)
    merchant_request_id = models.CharField(max_length=64, blank=True, default='')
    checkout_request_id = models.CharField(max_length=64, blank=True, default='', db_index=True)
    result_code = models.IntegerField(null=True, blank=True)
    result_desc = models.CharField(max_length=255, blank=True, default='')
    receipt_number = models.CharField(max_length=32, blank=True, default='')
    raw_callback = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'M-Pesa {self.amount} for checkout #{self.checkout_id} ({self.status})'


class ChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    message = models.TextField()
    # Set for the delivery chat between a trip's driver and the buyer (Module 9).
    order = models.ForeignKey('Order', on_delete=models.CASCADE, null=True, blank=True, related_name='messages')
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.sender.full_name} -> {self.receiver.full_name}: {self.message[:20]}"
