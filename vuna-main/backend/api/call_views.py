"""In-app calls (Module 11). Rules and the call's life live in calls.py."""
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import calls, schema
from .models import Call, Order, User
from .serializers import CallCheckSerializer, CallJoinSerializer, CallSerializer, CallStartSerializer


def _join(call: Call, user: User) -> dict:
    cfg = calls.config()
    other = call.callee_id if user.pk == call.caller_id else call.caller_id
    return {
        'call': call,
        'url': cfg.url if cfg else '',
        'token': calls.access_token(cfg, user, call.room) if cfg else '',
        'callee_online': calls.is_online(other),
    }


class CallCheckView(APIView):
    """Whether to show a call button for this person, and whether it would ring."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: CallCheckSerializer, 404: schema.ErrorResponse})
    def get(self, request, uid):
        other = get_object_or_404(User, uid=uid)
        enabled = calls.config() is not None
        return Response({
            'enabled': enabled,
            'allowed': enabled and calls.can_call(request.user, other),
            'online': calls.is_online(other.pk),
        })


class CallStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=CallStartSerializer,
                   responses={201: CallJoinSerializer, 400: schema.ErrorResponse, 403: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request):
        calls.sweep_stale()
        serializer = CallStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        callee = get_object_or_404(User, uid=data['callee'])
        order = Order.objects.select_related('trip').filter(pk=data['order']).first() if data.get('order') else None
        call = calls.start(caller=request.user, callee=callee, kind=data['kind'], order=order)
        return Response(CallJoinSerializer(_join(call, request.user)).data, status=status.HTTP_201_CREATED)


class CallAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: CallJoinSerializer, 400: schema.ErrorResponse, 403: schema.ErrorResponse})
    def post(self, request, pk):
        calls.sweep_stale()
        call = get_object_or_404(Call.objects.select_related('caller', 'callee'), pk=pk)
        call = calls.accept(user=request.user, call=call)
        return Response(CallJoinSerializer(_join(call, request.user)).data)


class CallHangUpView(APIView):
    """Decline, cancel or end, depending on who and when."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: CallSerializer, 403: schema.ErrorResponse})
    def post(self, request, pk):
        call = get_object_or_404(Call.objects.select_related('caller', 'callee'), pk=pk)
        return Response(CallSerializer(calls.hang_up(user=request.user, call=call)).data)
