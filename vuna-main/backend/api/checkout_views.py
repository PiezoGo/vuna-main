"""HTTP layer for addresses, cart quotes, checkouts and farmer answers. Rules live in checkout.py."""
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from . import checkout as rules
from . import schema
from .models import Checkout, DeliveryAddress
from .permissions import IsBuyer
from .serializers import (
    CheckoutCreateSerializer,
    CheckoutSerializer,
    DeliveryAddressSerializer,
    QuoteRequestSerializer,
    QuoteSerializer,
)


class DeliveryAddressViewSet(viewsets.ModelViewSet):
    """A buyer's saved delivery addresses."""
    serializer_class = DeliveryAddressSerializer
    permission_classes = [IsBuyer]
    pagination_class = None

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return DeliveryAddress.objects.none()
        return DeliveryAddress.objects.filter(buyer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)


class QuoteView(APIView):
    """Server-side totals and checks for a cart. Open to anyone: prices are public."""
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=QuoteRequestSerializer, responses={200: QuoteSerializer})
    def post(self, request):
        data = QuoteRequestSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        quote = rules.quote(data.validated_data['items'])
        return Response(QuoteSerializer(quote).data)


class CheckoutViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = CheckoutSerializer
    permission_classes = [IsBuyer]
    pagination_class = None

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Checkout.objects.none()
        mine = Checkout.objects.filter(buyer=self.request.user)
        rules.expire_stale(rules.Order.objects.filter(checkout__in=mine))
        return mine.prefetch_related('orders__product', 'orders__farmer', 'orders__buyer', 'orders__driver')

    @extend_schema(request=CheckoutCreateSerializer, responses={201: CheckoutSerializer, 400: schema.ErrorResponse})
    def create(self, request):
        data = CheckoutCreateSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        address = DeliveryAddress.objects.filter(pk=data.validated_data['address'], buyer=request.user).first()
        if address is None:
            return Response({'address': ['Choose one of your saved addresses.']}, status=status.HTTP_400_BAD_REQUEST)
        checkout = rules.create_checkout(
            buyer=request.user,
            items=data.validated_data['items'],
            address=address,
            delivery_date=data.validated_data['delivery_date'],
            payment_choice=data.validated_data['payment_choice'],
        )
        return Response(CheckoutSerializer(checkout).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses={200: CheckoutSerializer, 400: schema.ErrorResponse})
    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """Simulated M-Pesa payment for whatever is currently payable (replaced by STK Push in Module 5)."""
        checkout = rules.simulate_payment(self.get_object())
        return Response(CheckoutSerializer(checkout).data)
