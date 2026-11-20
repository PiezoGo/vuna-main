from django.contrib import admin
from .models import ChatMessage, Cooperative, Order, Product, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'role', 'approval_status', 'phone_number', 'city', 'cooperative', 'is_driver_active']
    list_filter = ['role', 'approval_status', 'cooperative', 'is_driver_active']
    search_fields = ['full_name', 'email', 'phone_number']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['title', 'farmer', 'base_price_per_unit', 'listed_price_per_unit', 'quantity', 'unit', 'is_active']
    list_filter = ['is_active', 'unit']
    search_fields = ['title', 'farmer__full_name']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'buyer', 'farmer', 'driver', 'status', 'total_price', 'farmer_paid']
    list_filter = ['status', 'farmer_paid']
    search_fields = ['product__title', 'buyer__full_name', 'farmer__full_name']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'receiver', 'message', 'timestamp', 'is_read']
    list_filter = ['is_read']


@admin.register(Cooperative)
class CooperativeAdmin(admin.ModelAdmin):
    list_display = ['name', 'county', 'is_active']
    list_filter = ['is_active', 'county']
    search_fields = ['name']
