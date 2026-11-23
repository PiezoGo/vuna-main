from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .accounts import (
    AdminFarmerApproveView,
    AdminFarmerListView,
    AdminFarmerRejectView,
    AdminResetPasswordView,
    AdminStaffCreateView,
    ChangePasswordView,
    CooperativeListView,
)
from .checkout_views import CheckoutViewSet, DeliveryAddressViewSet, MpesaCallbackView, PaymentDetailView, QuoteView
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
    FarmerSummaryView,
    AgentFarmersView,
    ChatMessageView,
    ChatInboxView,
)

router = DefaultRouter()
router.register('products', ProductViewSet, basename='product')
router.register('orders', OrderViewSet, basename='order')
router.register('addresses', DeliveryAddressViewSet, basename='address')
router.register('checkouts', CheckoutViewSet, basename='checkout')

urlpatterns = [
    # Auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('cooperatives/', CooperativeListView.as_view(), name='cooperatives'),
    path('checkouts/quote/', QuoteView.as_view(), name='checkout_quote'),
    path('payments/<int:pk>/', PaymentDetailView.as_view(), name='payment_detail'),
    path('payments/mpesa/callback/<str:token>/', MpesaCallbackView.as_view(), name='mpesa_callback'),

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
    path('admin/users/<uuid:uid>/reset-password/', AdminResetPasswordView.as_view(), name='admin_reset_password'),
    path('admin/staff/', AdminStaffCreateView.as_view(), name='admin_staff_create'),
    path('admin/farmers/', AdminFarmerListView.as_view(), name='admin_farmers'),
    path('admin/farmers/<uuid:uid>/approve/', AdminFarmerApproveView.as_view(), name='admin_farmer_approve'),
    path('admin/farmers/<uuid:uid>/reject/', AdminFarmerRejectView.as_view(), name='admin_farmer_reject'),

    # Driver endpoints
    path('driver/orders/', DriverOrderView.as_view(), name='driver_orders'),
    path('driver/update_status/', DriverUpdateStatusView.as_view(), name='driver_update_status'),

    # Farmer
    path('farmer/earnings/', FarmerEarningsView.as_view(), name='farmer_earnings'),
    path('farmer/summary/', FarmerSummaryView.as_view(), name='farmer_summary'),
    path('agent/farmers/', AgentFarmersView.as_view(), name='agent_farmers'),

    # Chat
    path('messages/', ChatMessageView.as_view(), name='messages'),
    path('messages/chats/', ChatInboxView.as_view(), name='chat_inbox'),

    # Router URLs (products, orders CRUD)
    path('', include(router.urls)),
]
