"""
Module 9 endpoints: the driver's trips and stops, buyer confirmation and problem reports,
the per-delivery chat, and the admin problems queue.
"""
from datetime import timedelta

from django.db.models import Case, IntegerField, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import delivery, schema
from .models import Order, Problem, Trip
from .permissions import IsAdmin, IsBuyer, IsDriver
from .serializers import (
    CollectSerializer,
    DeliverSerializer,
    DeliveryMessageCreateSerializer,
    DeliveryMessageSerializer,
    OrderSerializer,
    ProblemCreateSerializer,
    ProblemDecisionSerializer,
    ProblemSerializer,
    TripSerializer,
    TripStopSerializer,
)


class DriverTripsView(APIView):
    """The driver's own trips: today and upcoming first, then the last 14 days."""
    permission_classes = [IsDriver]

    @extend_schema(responses=TripSerializer(many=True))
    def get(self, request):
        today = timezone.localdate()
        trips = (
            Trip.objects.filter(driver=request.user, delivery_date__gte=today - timedelta(days=14))
            .exclude(status='cancelled')
            .select_related('driver')
            .annotate(past=Case(When(delivery_date__lt=today, then=1), default=0, output_field=IntegerField()))
            .order_by('past', 'delivery_date', 'id')
        )
        upcoming = [t for t in trips if not t.past]
        past = sorted((t for t in trips if t.past), key=lambda t: t.delivery_date, reverse=True)
        return Response(TripSerializer(upcoming + past, many=True).data)


class DriverStopView(APIView):
    permission_classes = [IsDriver]

    @extend_schema(operation_id='driver_stop', responses={200: TripStopSerializer, 403: schema.ErrorResponse})
    def get(self, request, pk):
        return Response(TripStopSerializer(delivery.driver_order(request.user, pk)).data)


class DriverCollectView(APIView):
    permission_classes = [IsDriver]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request={'multipart/form-data': CollectSerializer},
                   responses={200: TripStopSerializer, 400: schema.ErrorResponse, 403: schema.ErrorResponse})
    def post(self, request, pk):
        order = delivery.driver_order(request.user, pk)
        serializer = CollectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        order = delivery.collect(request=request, order=order, photo=data['photo'],
                                 condition=data['condition'], note=data.get('note', ''))
        return Response(TripStopSerializer(order).data)


class DriverDeliverView(APIView):
    permission_classes = [IsDriver]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request={'multipart/form-data': DeliverSerializer},
                   responses={200: TripStopSerializer, 400: schema.ErrorResponse, 403: schema.ErrorResponse})
    def post(self, request, pk):
        order = delivery.driver_order(request.user, pk)
        serializer = DeliverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = delivery.deliver(request=request, order=order, photo=serializer.validated_data['photo'])
        return Response(TripStopSerializer(order).data)


class BuyerAwaitingConfirmationView(APIView):
    """Delivered lines the buyer hasn't confirmed: shown as a prompt after sign-in."""
    permission_classes = [IsBuyer]

    @extend_schema(responses=OrderSerializer(many=True))
    def get(self, request):
        lines = Order.objects.filter(buyer=request.user, status='delivered').select_related(
            'product', 'buyer', 'farmer', 'driver', 'checkout').order_by('delivered_at')
        return Response(OrderSerializer(lines, many=True).data)


class BuyerConfirmView(APIView):
    permission_classes = [IsBuyer]

    @extend_schema(request=None, responses={200: OrderSerializer, 400: schema.ErrorResponse, 403: schema.ErrorResponse})
    def post(self, request, pk):
        order = delivery.confirm(buyer=request.user, order=get_object_or_404(Order, pk=pk, buyer=request.user))
        return Response(OrderSerializer(order).data)


class BuyerProblemView(APIView):
    permission_classes = [IsBuyer]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(request={'multipart/form-data': ProblemCreateSerializer},
                   responses={201: OrderSerializer, 400: schema.ErrorResponse, 403: schema.ErrorResponse})
    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, buyer=request.user)
        serializer = ProblemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        delivery.report_problem(request=request, order=order, reason=data['reason'],
                                description=data['description'], photo=data['photo'])
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class DeliveryChatView(APIView):
    """Messages about one delivery, between the trip's driver and the buyer only."""
    permission_classes = [permissions.IsAuthenticated]

    def _order(self, pk):
        return get_object_or_404(Order.objects.select_related('trip__driver', 'buyer'), pk=pk)

    @extend_schema(responses={200: DeliveryMessageSerializer(many=True), 403: schema.ErrorResponse})
    def get(self, request, pk):
        messages = delivery.chat_messages(request.user, self._order(pk))
        return Response(DeliveryMessageSerializer(messages, many=True).data)

    @extend_schema(request=DeliveryMessageCreateSerializer,
                   responses={201: DeliveryMessageSerializer, 400: schema.ErrorResponse, 403: schema.ErrorResponse})
    def post(self, request, pk):
        serializer = DeliveryMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = delivery.send_chat(request.user, self._order(pk), serializer.validated_data['message'])
        return Response(DeliveryMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class AdminProblemListView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(parameters=[OpenApiParameter('status', str, enum=['open', 'refunded', 'rejected', 'all'])],
                   responses=ProblemSerializer(many=True))
    def get(self, request):
        problems = Problem.objects.select_related('order__product', 'order__farmer', 'buyer', 'decided_by')
        wanted = request.query_params.get('status', 'open')
        if wanted != 'all':
            problems = problems.filter(status=wanted)
        return Response(ProblemSerializer(problems.order_by('-created_at')[:200], many=True).data)


class AdminProblemDecideView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(request=ProblemDecisionSerializer,
                   responses={200: ProblemSerializer, 400: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, pk):
        serializer = ProblemDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        problem = delivery.decide(
            actor=request.user, problem=get_object_or_404(Problem, pk=pk), decision=data['decision'],
            fault=data.get('fault', ''), amount=data.get('amount'), note=data['note'],
        )
        return Response(ProblemSerializer(problem).data)
