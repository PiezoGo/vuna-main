import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = [
        ('farmer', 'Farmer'),
        ('buyer', 'Buyer'),
        ('admin', 'Admin'),
        ('driver', 'Driver'),
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
    title = models.CharField(max_length=255)
    commodity = models.CharField(max_length=100, blank=True, null=True)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    delivery_time_manual = models.PositiveIntegerField(blank=True, null=True)
    delivery_time_varies = models.BooleanField(default=False)
    images = models.JSONField(default=list, blank=True)  # List of image URLs
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
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
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    mock_payment_id = models.CharField(max_length=50, blank=True, null=True)
    farmer_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} - {self.product.title} ({self.status})"


class ChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.sender.full_name} -> {self.receiver.full_name}: {self.message[:20]}"
