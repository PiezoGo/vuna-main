"""Inbox and conversations (Module 10). Live delivery happens in realtime.py."""
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import chat, realtime, schema
from .models import ChatMessage, User
from .serializers import ChatLineSerializer, ChatSendSerializer, ConversationSerializer, InboxItemSerializer


class InboxView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=InboxItemSerializer(many=True))
    def get(self, request):
        return Response(InboxItemSerializer(chat.inbox(request.user), many=True).data)


class ConversationView(APIView):
    """GET: messages with one person (marks theirs read). POST: send them a message."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: ConversationSerializer, 404: schema.ErrorResponse})
    def get(self, request, uid):
        other = get_object_or_404(User, uid=uid)
        messages = list(chat.conversation(request.user, other)[:500])
        allowed = chat.can_chat(request.user, other)
        if not messages and not allowed:
            return Response({'error': 'You can\'t message this person.'}, status=status.HTTP_404_NOT_FOUND)
        if chat.mark_conversation_read(request.user, other):
            realtime.conversation_read(request.user.pk, other.pk)
        return Response(ConversationSerializer({'partner': other, 'can_send': allowed, 'messages': messages}).data)

    @extend_schema(request=ChatSendSerializer,
                   responses={201: ChatLineSerializer, 400: schema.ErrorResponse, 403: schema.ErrorResponse, 404: schema.ErrorResponse})
    def post(self, request, uid):
        other = get_object_or_404(User, uid=uid)
        if not chat.can_chat(request.user, other):
            return Response({'error': 'You can\'t message this person.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ChatSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = ChatMessage.objects.create(sender=request.user, receiver=other, message=serializer.validated_data['message'])
        return Response(ChatLineSerializer(message).data, status=status.HTTP_201_CREATED)
