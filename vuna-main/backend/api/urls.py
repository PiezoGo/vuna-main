from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    ProfileUpdateView,
    PublicProfileView,
    ProductViewSet,
    OrderViewSet,
    MockPayView,
    AdminDriverManagementView,
    AdminAssignDriverView,
    AdminCompleteOrderView,
    AdminAllOrdersView,
    AdminUsersView,
    DriverOrderView,
    DriverUpdateStatusView,
    FarmerEarningsView,
    ChatMessageView,
    ChatInboxView,
)

router = DefaultRouter()
router.register('products', ProductViewSet, basename='product')
router.register('orders', OrderViewSet, basename='order')

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Profile
    path('profile/', ProfileUpdateView.as_view(), name='profile_update'),
    path('profile/<uuid:uid>/', PublicProfileView.as_view(), name='public_profile'),

    # Mock M-PESA payment
    path('orders/<int:order_id>/mock_pay/', MockPayView.as_view(), name='mock_pay'),

    # Admin endpoints
    path('admin/drivers/', AdminDriverManagementView.as_view(), name='admin_drivers'),
    path('admin/assign_driver/', AdminAssignDriverView.as_view(), name='admin_assign_driver'),
    path('admin/complete_order/', AdminCompleteOrderView.as_view(), name='admin_complete_order'),
    path('admin/orders/', AdminAllOrdersView.as_view(), name='admin_orders'),
    path('admin/users/', AdminUsersView.as_view(), name='admin_users'),

    # Driver endpoints
    path('driver/orders/', DriverOrderView.as_view(), name='driver_orders'),
    path('driver/update_status/', DriverUpdateStatusView.as_view(), name='driver_update_status'),

    # Farmer
    path('farmer/earnings/', FarmerEarningsView.as_view(), name='farmer_earnings'),

    # Chat
    path('messages/', ChatMessageView.as_view(), name='messages'),
    path('messages/chats/', ChatInboxView.as_view(), name='chat_inbox'),

    # Router URLs (products, orders CRUD)
    path('', include(router.urls)),
]
