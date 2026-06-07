from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    ProductViewSet,
    OrderViewSet,
    ChatMessageView,
    ChatInboxView,
    FarmerEarningsView,
    ProfileUpdateView
)

router = DefaultRouter()
router.register('products', ProductViewSet, basename='product')
router.register('orders', OrderViewSet, basename='order')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('messages/', ChatMessageView.as_view(), name='messages'),
    path('messages/chats/', ChatInboxView.as_view(), name='chat_inbox'),
    path('farmer/earnings/', FarmerEarningsView.as_view(), name='farmer_earnings'),
    path('profile/', ProfileUpdateView.as_view(), name='profile_update'),
    path('', include(router.urls)),
]
