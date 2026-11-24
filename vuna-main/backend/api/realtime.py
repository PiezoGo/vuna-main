"""
Live events to signed-in browsers over Django Channels (Module 10).

Everything here is best-effort: if no socket is connected (or the server runs under plain
WSGI/gunicorn), events go nowhere and the website's 60-second check catches up. Events are
sent after the database commit so a browser never refetches data that isn't saved yet.
"""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

log = logging.getLogger(__name__)

ADMINS = 'role.admin'


def user_group(uid) -> str:
    return f'user.{uid}'


def _send(group: str, event: dict) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    try:
        async_to_sync(layer.group_send)(group, {'type': 'forward', 'event': event})
    except Exception:  # noqa: BLE001 — a live event must never break the request that caused it
        log.exception('Live event to %s failed', group)


def push(group: str, event: dict) -> None:
    transaction.on_commit(lambda: _send(group, event))


def push_user(uid, event: dict) -> None:
    push(user_group(uid), event)


def badges_changed(*uids, admins: bool = False) -> None:
    """Tell these users (and optionally all admins) to refetch their badge counts."""
    for uid in {u for u in uids if u}:
        push_user(uid, {'type': 'badges'})
    if admins:
        push(ADMINS, {'type': 'badges'})


# Any change to an order, trip, problem or new farmer can move someone's badge counts.

@receiver(post_save, sender='api.Order')
def _order_saved(sender, instance, **kwargs):
    driver = instance.trip.driver_id if instance.trip_id and instance.trip else instance.driver_id
    agent = getattr(instance.farmer, 'agent_id', None)
    badges_changed(instance.buyer_id, instance.farmer_id, driver, agent, admins=True)


@receiver(post_save, sender='api.Trip')
def _trip_saved(sender, instance, **kwargs):
    badges_changed(instance.driver_id, admins=True)


@receiver(post_save, sender='api.Problem')
def _problem_saved(sender, instance, **kwargs):
    badges_changed(instance.buyer_id, admins=True)


@receiver(post_save, sender='api.User')
def _user_saved(sender, instance, created, **kwargs):
    if created and instance.role == 'farmer':
        badges_changed(admins=True)


@receiver(post_save, sender='api.ChatMessage')
def _message_saved(sender, instance, created, **kwargs):
    if not created:
        return
    from .serializers import ChatLineSerializer
    line = ChatLineSerializer(instance).data
    line = {**line, 'sender': str(line['sender']), 'receiver': str(line['receiver']), 'timestamp': instance.timestamp.isoformat()}
    push_user(instance.receiver_id, {'type': 'message', 'partner': str(instance.sender_id), 'message': line})
    push_user(instance.sender_id, {'type': 'message', 'partner': str(instance.receiver_id), 'message': line})
    badges_changed(instance.receiver_id)


def conversation_read(reader_id, partner_id) -> None:
    """The reader opened the conversation: their unread count drops; the partner sees "Seen"."""
    badges_changed(reader_id)
    push_user(partner_id, {'type': 'read', 'partner': str(reader_id)})
