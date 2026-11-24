"""
Admin operations dashboard (Module 8): today's overview, order steps, delivery trips,
farmer payouts, buyer refunds and user management. Every view is admin-only.
"""
import uuid
from datetime import timedelta

from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import fulfilment, schema
from .models import Order, Trip, User
from .permissions import IsAdmin
from .serializers import (
    AdminOverviewSerializer,
    AgentLinkSerializer,
    OrderSerializer,
    OrderStepSerializer,
    PayoutLineSerializer,
    ReferenceSerializer,
    RefundLineSerializer,
    TripCreateSerializer,
    TripOrdersSerializer,
    TripSerializer,
    UserActiveSerializer,
    UserSerializer,
)


def _start_of_week(now):
    today = timezone.localdate(now)
    monday = today - timedelta(days=today.weekday())
    return timezone.make_aware(timezone.datetime.combine(monday, timezone.datetime.min.time()))


class AdminOverviewView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses=AdminOverviewSerializer)
    def get(self, request):
        now = timezone.now()
        due = fulfilment.payouts_due()
        overdue_before = now - timedelta(hours=fulfilment.PAYOUT_PROMISE_HOURS)
        week = Order.objects.filter(is_paid=True, refunded=False, created_at__gte=_start_of_week(now))
        data = {
            'waiting_for_farmers': Order.objects.filter(status='pending').count(),
            'awaiting_payment': Order.objects.filter(status='accepted', is_paid=False).count(),
            'paid_without_trip': Order.objects.filter(status='paid', is_paid=True, refunded=False, trip__isnull=True).count(),
            'trips_today': Trip.objects.filter(delivery_date=timezone.localdate(now)).exclude(status='cancelled').count(),
            'payouts_due': due.count(),
            'payouts_overdue': due.filter(collected_at__lt=overdue_before).count(),
            'refunds_to_send': fulfilment.refunds_due().count(),
            'pending_farmers': User.objects.filter(role='farmer', approval_status='pending', is_active=True).count(),
            'week_gmv': week.aggregate(total=Sum('total_price'))['total'] or 0,
            'week_orders': week.count(),
        }
        return Response(AdminOverviewSerializer(data).data)


class AdminOrderStepView(APIView):
    """Mark a line collected / in transit / delivered / completed by hand (until the driver app)."""
    permission_classes = [IsAdmin]

    @extend_schema(request=OrderStepSerializer, responses={200: OrderSerializer, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = OrderStepSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = fulfilment.advance(
            actor=request.user, order=order, to=serializer.validated_data['status'],
            note=serializer.validated_data.get('note', '') or 'Marked by admin',
        )
        return Response(OrderSerializer(order).data)


def _trip_queryset():
    return Trip.objects.select_related('driver').prefetch_related('orders')


class AdminTripListView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        parameters=[OpenApiParameter('date', str, description='Delivery date, YYYY-MM-DD')],
        responses=TripSerializer(many=True),
    )
    def get(self, request):
        trips = _trip_queryset()
        wanted = request.query_params.get('date')
        if wanted:
            day = parse_date(wanted)
            if day is None:
                return Response({'error': 'Use a date like 2026-11-24.'}, status=status.HTTP_400_BAD_REQUEST)
            trips = trips.filter(delivery_date=day)
        else:
            trips = trips.filter(delivery_date__gte=timezone.localdate() - timedelta(days=7))
        return Response(TripSerializer(trips[:200], many=True).data)

    @extend_schema(request=TripCreateSerializer, responses={201: TripSerializer, 400: schema.ErrorResponse})
    def post(self, request):
        serializer = TripCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        driver = User.objects.filter(uid=data['driver']).first()
        if driver is None:
            return Response({'driver': ['Driver not found.']}, status=status.HTTP_400_BAD_REQUEST)
        trip = fulfilment.create_trip(
            actor=request.user, delivery_date=data['delivery_date'], driver=driver,
            order_ids=data['orders'], notes=data.get('notes', ''),
        )
        return Response(TripSerializer(trip).data, status=status.HTTP_201_CREATED)


class AdminTripDetailView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses={200: TripSerializer, 404: schema.ErrorResponse})
    def get(self, request, pk):
        return Response(TripSerializer(get_object_or_404(_trip_queryset(), pk=pk)).data)


class AdminTripOrdersView(APIView):
    """Replace the trip's orders (add, remove, reorder). An empty list cancels the trip."""
    permission_classes = [IsAdmin]

    @extend_schema(request=TripOrdersSerializer, responses={200: TripSerializer, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def put(self, request, pk):
        trip = get_object_or_404(Trip, pk=pk)
        serializer = TripOrdersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trip = fulfilment.set_trip_orders(actor=request.user, trip=trip, order_ids=serializer.validated_data['orders'])
        return Response(TripSerializer(trip).data)


class AdminTripCancelView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=None, responses={200: TripSerializer, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, pk):
        trip = fulfilment.cancel_trip(actor=request.user, trip=get_object_or_404(Trip, pk=pk))
        return Response(TripSerializer(trip).data)


class AdminPayoutListView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses=PayoutLineSerializer(many=True))
    def get(self, request):
        return Response(PayoutLineSerializer(fulfilment.payouts_due(), many=True).data)


class AdminPayoutRecordView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=ReferenceSerializer, responses={200: OrderSerializer, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, pk):
        serializer = ReferenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = fulfilment.record_payout(
            actor=request.user, order=get_object_or_404(Order, pk=pk), reference=serializer.validated_data['reference'],
        )
        return Response(OrderSerializer(order).data)


class AdminRefundListView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses=RefundLineSerializer(many=True))
    def get(self, request):
        return Response(RefundLineSerializer(fulfilment.refunds_due(), many=True).data)


class AdminRefundRecordView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=ReferenceSerializer, responses={200: OrderSerializer, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, pk):
        serializer = ReferenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = fulfilment.record_refund(
            actor=request.user, order=get_object_or_404(Order, pk=pk), reference=serializer.validated_data['reference'],
        )
        return Response(OrderSerializer(order).data)


class AdminUserActiveView(APIView):
    """Deactivate (or reactivate) an account. Users are never deleted: their orders must stay."""
    permission_classes = [IsAdmin]

    @extend_schema(request=UserActiveSerializer, responses={200: UserSerializer, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, uid):
        user = get_object_or_404(User, uid=uid)
        if user.role == 'admin':
            return Response({'error': 'Admin accounts cannot be changed here.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = UserActiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        active = serializer.validated_data['active']
        user.is_active = active
        fields = ['is_active']
        if user.role == 'driver':
            user.is_driver_active = active
            fields.append('is_driver_active')
        user.save(update_fields=fields)
        if not active:
            Token.objects.filter(user=user).delete()  # signed out everywhere
        return Response(UserSerializer(user).data)


class AdminFarmerAgentView(APIView):
    """Link a farmer to a field agent (or unlink with null)."""
    permission_classes = [IsAdmin]

    @extend_schema(request=AgentLinkSerializer, responses={200: UserSerializer, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, uid):
        farmer = get_object_or_404(User, uid=uid, role='farmer')
        serializer = AgentLinkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agent_id = serializer.validated_data['agent']
        agent = None
        if agent_id is not None:
            agent = User.objects.filter(uid=agent_id, role='agent', is_active=True).first()
            if agent is None:
                return Response({'agent': ['Choose an active field agent.']}, status=status.HTTP_400_BAD_REQUEST)
        farmer.agent = agent
        farmer.save(update_fields=['agent'])
        return Response(UserSerializer(farmer).data)


def _uuid(value):
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise ValidationError({'error': 'Invalid user id.'})


def filter_admin_orders(queryset, params):
    """Filters for the admin orders list: status, delivery date, farmer, buyer, unscheduled, search."""
    if params.get('status'):
        queryset = queryset.filter(status=params['status'])
    if params.get('date'):
        day = parse_date(params['date'])
        if day is None:
            raise ValidationError({'error': 'Use a date like 2026-11-24.'})
        queryset = queryset.filter(checkout__delivery_date=day)
    if params.get('farmer'):
        queryset = queryset.filter(farmer__uid=_uuid(params['farmer']))
    if params.get('buyer'):
        queryset = queryset.filter(buyer__uid=_uuid(params['buyer']))
    if params.get('unscheduled') == 'true':
        queryset = queryset.filter(trip__isnull=True)
    if params.get('q'):
        q = params['q'].strip()
        match = Q(product__title__icontains=q) | Q(farmer__full_name__icontains=q) | Q(buyer__full_name__icontains=q)
        if q.lstrip('#').isdigit():
            match |= Q(id=int(q.lstrip('#')))
        queryset = queryset.filter(match)
    return queryset
