"""Bell items, sidebar badge counts and the live-connection ticket (Module 10)."""
from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from . import notifications
from .consumers import make_ticket
from .models import Notification
from .serializers import (
    NotificationSerializer,
    NotificationSummarySerializer,
    ReadIdsSerializer,
    RealtimeTicketSerializer,
)


class NotificationSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=NotificationSummarySerializer)
    def get(self, request):
        return Response(NotificationSummarySerializer(notifications.summary(request.user)).data)


class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=NotificationSerializer(many=True))
    def get(self, request):
        items = Notification.objects.filter(user=request.user)[:20]
        return Response(NotificationSerializer(items, many=True).data)


class NotificationReadView(APIView):
    """Mark some bell items read (`ids`), or all of them when `ids` is left out."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ReadIdsSerializer, responses=NotificationSummarySerializer)
    def post(self, request):
        serializer = ReadIdsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notifications.mark_read(request.user, serializer.validated_data.get('ids'))
        return Response(NotificationSummarySerializer(notifications.summary(request.user)).data)


class RealtimeTicketView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses=RealtimeTicketSerializer)
    def post(self, request):
        return Response({'ticket': make_ticket(request.user)})
