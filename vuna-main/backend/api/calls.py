"""
In-app calls (Module 11): who may call whom, LiveKit access passes, and the call's life
(ringing → answered → ended, or declined / missed). Media flows through LiveKit Cloud;
ringing uses the Module 10 live connection.
"""
import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from datetime import timedelta

from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from . import realtime
from .models import Call, ChatMessage, Order, User
from .notifications import notify

RING_SECONDS = 30
TOKEN_SECONDS = 10 * 60  # time to join the room; LiveKit keeps you in once connected


@dataclass(frozen=True)
class LiveKitConfig:
    url: str
    api_key: str
    api_secret: str


def config() -> LiveKitConfig | None:
    """LiveKit settings from the environment, or None when calls aren't set up."""
    values = [os.environ.get(name, '').strip() for name in ('LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET')]
    return LiveKitConfig(*values) if all(values) else None


# ── Who may call whom ─────────────────────────────────────────

def _open_orders():
    return Order.objects.exclude(status__in=('cancelled', 'expired', 'declined'))


def can_call(me: User, other: User) -> bool:
    """
    Admins call anyone. Buyers and farmers only once they share an order (business rule 20).
    Drivers call the buyers and farmers on their own (not cancelled) trips. Nobody else.
    """
    if me.pk == other.pk or not other.is_active or not me.is_active:
        return False
    roles = {me.role, other.role}
    if 'admin' in roles:
        return True
    if roles == {'buyer', 'farmer'}:
        buyer, farmer = (me, other) if me.role == 'buyer' else (other, me)
        return _open_orders().filter(buyer=buyer, farmer=farmer).exists()
    if 'driver' in roles and roles & {'buyer', 'farmer'}:
        driver, person = (me, other) if me.role == 'driver' else (other, me)
        trips = Order.objects.filter(trip__driver=driver).exclude(trip__status='cancelled')
        return trips.filter(Q(buyer=person) | Q(farmer=person)).exists()
    return False


# ── LiveKit access pass ───────────────────────────────────────

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def access_token(cfg: LiveKitConfig, user: User, room: str, now: int | None = None) -> str:
    """A LiveKit access token (HS256 JWT) for one person in one room, valid TOKEN_SECONDS."""
    now = int(now if now is not None else time.time())
    header = {'alg': 'HS256', 'typ': 'JWT'}
    payload = {
        'iss': cfg.api_key,
        'sub': str(user.pk),
        'name': user.full_name,
        'nbf': now - 10,
        'exp': now + TOKEN_SECONDS,
        'video': {'room': room, 'roomJoin': True, 'canPublish': True, 'canSubscribe': True},
    }
    signing_input = f"{_b64(json.dumps(header, separators=(',', ':')).encode())}.{_b64(json.dumps(payload, separators=(',', ':')).encode())}"
    signature = hmac.new(cfg.api_secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return f'{signing_input}.{_b64(signature)}'


# ── Presence (who has the site open with a live connection) ───

def _presence_key(uid) -> str:
    return f'online:{uid}'


def went_online(uid) -> None:
    key = _presence_key(uid)
    if not cache.add(key, 1, None):
        try:
            cache.incr(key)
        except ValueError:
            cache.set(key, 1, None)


def went_offline(uid) -> None:
    key = _presence_key(uid)
    try:
        if cache.decr(key) <= 0:
            cache.delete(key)
    except ValueError:
        pass


def is_online(uid) -> bool:
    return bool(cache.get(_presence_key(uid)))


# ── The call's life ───────────────────────────────────────────

def _event(call: Call, name: str) -> dict:
    return {
        'type': 'call',
        'event': name,
        'call': {
            'id': str(call.id), 'kind': call.kind, 'status': call.status,
            'caller': {'uid': str(call.caller_id), 'full_name': call.caller.full_name, 'role': call.caller.role},
            'callee': {'uid': str(call.callee_id), 'full_name': call.callee.full_name, 'role': call.callee.role},
            'order': call.order_id,
            'order_title': f'{call.order.quantity} {call.order.product.unit} {call.order.product.title}' if call.order_id else None,
        },
    }


def _tell(call: Call, name: str, *uids) -> None:
    event = _event(call, name)
    for uid in uids:
        realtime.push_user(uid, event)


def _kind_label(call: Call) -> str:
    return 'video call' if call.kind == 'video' else 'audio call'


def _chat_line(call: Call, text: str) -> None:
    ChatMessage.objects.create(sender=call.caller, receiver=call.callee, message=text, order=call.order)


def _locked(call: Call) -> Call:
    # No select_related here: PostgreSQL refuses FOR UPDATE across nullable joins (see fulfilment.lock_orders).
    return Call.objects.select_for_update().get(pk=call.pk)


def _mark_missed(call: Call) -> None:
    call.status, call.ended_at = 'missed', timezone.now()
    call.save(update_fields=['status', 'ended_at'])
    label = _kind_label(call)
    notify(call.callee, 'call_missed', f'Missed {label} from {call.caller.full_name}', 'Tap to call back or send a message.',
           f'/messages/{call.caller_id}')
    _chat_line(call, f'Missed {label}')
    _tell(call, 'missed', call.caller_id, call.callee_id)


def sweep_stale(now=None) -> int:
    """Ringing calls nobody answered within RING_SECONDS become missed. Safe to call often."""
    cutoff = (now or timezone.now()) - timedelta(seconds=RING_SECONDS)
    count = 0
    for call in Call.objects.filter(status='ringing', created_at__lt=cutoff).select_related('caller', 'callee'):
        with transaction.atomic():
            locked = _locked(call)
            if locked.status == 'ringing':
                locked.caller, locked.callee = call.caller, call.callee
                _mark_missed(locked)
                count += 1
    return count


def _about(order: Order, *people: User) -> bool:
    involved = {order.buyer_id, order.farmer_id}
    if order.trip_id:
        involved.add(order.trip.driver_id)
    return all(p.pk in involved or p.role == 'admin' for p in people)


@transaction.atomic
def start(*, caller: User, callee: User, kind: str, order: Order | None) -> Call:
    if config() is None:
        raise ValidationError({'error': "Calls aren't set up yet."})
    if not can_call(caller, callee):
        raise PermissionDenied("You can't call this person.")
    if order is not None and not _about(order, caller, callee):
        order = None  # only link an order the call is actually about
    call = Call.objects.create(caller=caller, callee=callee, kind=kind, order=order)
    _tell(call, 'incoming', callee.pk)
    return call


def _participant(call: Call, user: User) -> None:
    if user.pk not in (call.caller_id, call.callee_id):
        raise PermissionDenied('This is not your call.')


@transaction.atomic
def accept(*, user: User, call: Call) -> Call:
    if user.pk != call.callee_id:
        raise PermissionDenied('Only the person called can answer.')
    locked = _locked(call)
    if locked.status != 'ringing':
        raise ValidationError({'error': 'This call has already ended.'})
    locked.status, locked.answered_at = 'answered', timezone.now()
    locked.save(update_fields=['status', 'answered_at'])
    call.status, call.answered_at = locked.status, locked.answered_at
    _tell(call, 'accepted', call.caller_id, call.callee_id)
    return call


@transaction.atomic
def hang_up(*, user: User, call: Call) -> Call:
    """
    Decline (callee, while ringing), cancel (caller, while ringing: the callee sees a missed
    call), or end (either, once answered). Ending twice is harmless.
    """
    _participant(call, user)
    locked = _locked(call)
    if locked.status == 'ringing':
        if user.pk == call.callee_id:
            locked.status, locked.ended_at = 'declined', timezone.now()
            locked.save(update_fields=['status', 'ended_at'])
            _tell(call, 'declined', call.caller_id, call.callee_id)
        else:
            _mark_missed(locked)
    elif locked.status == 'answered':
        locked.status, locked.ended_at = 'ended', timezone.now()
        locked.save(update_fields=['status', 'ended_at'])
        minutes = max(1, round((locked.ended_at - locked.answered_at).total_seconds() / 60))
        _chat_line(call, f'{_kind_label(call).capitalize()} · {minutes} min')
        _tell(call, 'ended', call.caller_id, call.callee_id)
    call.status, call.ended_at = locked.status, locked.ended_at
    return call
