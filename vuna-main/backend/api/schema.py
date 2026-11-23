"""
OpenAPI documentation-only serializers for the hand-written APIViews.
They describe request/response shapes so drf-spectacular (and the generated
TypeScript types in packages/api) are accurate. They are not used for validation.
"""
from drf_spectacular.utils import OpenApiParameter, inline_serializer
from rest_framework import serializers

from .serializers import (
    ChatMessageSerializer, DriverSerializer, FarmerProfileSerializer, OrderSerializer, ProductSerializer,
    UserSerializer,
)

ErrorResponse = inline_serializer('ErrorResponse', {'error': serializers.CharField()})
DetailResponse = inline_serializer('DetailResponse', {'detail': serializers.CharField()})

AuthResponse = inline_serializer('AuthResponse', {
    'token': serializers.CharField(),
    'user': UserSerializer(),
})
LoginRequest = inline_serializer('LoginRequest', {
    'email': serializers.EmailField(),
    'password': serializers.CharField(),
})

class PublicProfileResponse(FarmerProfileSerializer):
    products = ProductSerializer(many=True)
    completed_sales = serializers.IntegerField()
    total_listings = serializers.IntegerField()

    class Meta(FarmerProfileSerializer.Meta):
        ref_name = 'PublicProfile'
        fields = FarmerProfileSerializer.Meta.fields + ['products', 'completed_sales', 'total_listings']
        read_only_fields = fields

MockPayRequest = inline_serializer('MockPayRequest', {'code': serializers.CharField()})
MockPayResponse = inline_serializer('MockPayResponse', {
    'detail': serializers.CharField(),
    'mock_payment_id': serializers.CharField(),
    'order': OrderSerializer(),
})

OrderActionResponse = inline_serializer('OrderActionResponse', {
    'detail': serializers.CharField(),
    'order': OrderSerializer(),
})

DriverCreateRequest = inline_serializer('DriverCreateRequest', {
    'full_name': serializers.CharField(),
    'phone_number': serializers.CharField(),
    'vehicle_type': serializers.CharField(required=False),
})
DriverIdRequest = inline_serializer('DriverIdRequest', {'driver_id': serializers.UUIDField()})
AssignDriverRequest = inline_serializer('AssignDriverRequest', {
    'order_id': serializers.IntegerField(),
    'driver_id': serializers.UUIDField(),
})
OrderIdRequest = inline_serializer('OrderIdRequest', {'order_id': serializers.IntegerField()})
UserIdRequest = inline_serializer('UserIdRequest', {'user_id': serializers.UUIDField()})

DriverOrdersResponse = inline_serializer('DriverOrders', {
    'current_order': OrderSerializer(allow_null=True),
    'history': OrderSerializer(many=True),
})
DriverStatusRequest = inline_serializer('DriverStatusRequest', {
    'status': serializers.ChoiceField(choices=['collected', 'in_transit', 'delivered']),
})

FarmerEarningsResponse = inline_serializer('FarmerEarnings', {
    'total_earnings': serializers.FloatField(),
    'completed_orders': OrderSerializer(many=True),
})

SendMessageRequest = inline_serializer('SendMessageRequest', {
    'receiver_id': serializers.UUIDField(),
    'message': serializers.CharField(),
})
ChatInboxItems = inline_serializer('ChatInboxItem', {
    'partner': UserSerializer(),
    'last_message': ChatMessageSerializer(),
}, many=True)

STATUS_PARAM = OpenApiParameter('status', str, description='Filter by order status')
ROLE_PARAM = OpenApiParameter('role', str, description='Filter by role')
RECEIVER_PARAM = OpenApiParameter('receiver_id', str, required=True, description='Chat partner uid')

__all__ = [name for name in dir() if name[0].isupper()] + ['DriverSerializer']
