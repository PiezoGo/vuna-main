"""
Delivery by the driver, buyer confirmation, problem reports and the delivery chat (Module 9).
Status changes go through fulfilment.advance so every step is logged with who and when.
"""
import uuid
from decimal import Decimal

from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from . import fulfilment
from .models import ChatMessage, Order, Problem, User
from .pricing import farmer_share_of_refund

MAX_PHOTO_BYTES = 5 * 1024 * 1024


def save_photo(request, upload, folder: str, field: str = 'photo') -> str:
    """Store an uploaded photo (Cloudinary in production) and return its absolute URL."""
    if upload is None:
        raise ValidationError({field: ['Take or choose a photo.']})
    if not (upload.content_type or '').startswith('image/'):
        raise ValidationError({field: ['Upload a photo (JPEG, PNG or WebP).']})
    if upload.size > MAX_PHOTO_BYTES:
        raise ValidationError({field: ['Photos must be under 5 MB.']})
    name = default_storage.save(f'{folder}/{uuid.uuid4().hex[:12]}_{upload.name}', upload)
    url = default_storage.url(name)
    if url.startswith('//'):
        return 'https:' + url
    return url if url.startswith('http') else request.build_absolute_uri(url)


# ── Driver ────────────────────────────────────────────────────

def driver_order(driver: User, pk: int) -> Order:
    """An order line on one of this driver's (not cancelled) trips."""
    order = Order.objects.select_related('trip', 'product', 'farmer', 'buyer', 'checkout').filter(pk=pk).first()
    if order is None or order.trip is None or order.trip.status == 'cancelled' or order.trip.driver_id != driver.pk:
        raise PermissionDenied('This stop is not on one of your trips.')
    return order


@transaction.atomic
def collect(*, request, order: Order, photo, condition: str, note: str = '') -> Order:
    if order.status != 'assigned':
        raise ValidationError({'error': f'Order #{order.id} is "{order.get_status_display()}", not waiting for pickup.'})
    url = save_photo(request, photo, 'pickups')
    order = fulfilment.advance(actor=request.user, order=order, to='collected', note=note or f'Condition: {condition}')
    order.pickup_photo, order.pickup_condition, order.pickup_note = url, condition, note[:255]
    order.save(update_fields=['pickup_photo', 'pickup_condition', 'pickup_note'])
    return order


@transaction.atomic
def deliver(*, request, order: Order, photo) -> Order:
    if order.status not in ('collected', 'in_transit'):
        raise ValidationError({'error': f'Order #{order.id} is "{order.get_status_display()}" and can\'t be delivered yet.'})
    url = save_photo(request, photo, 'deliveries')
    order = fulfilment.advance(actor=request.user, order=order, to='delivered', note='Delivered by driver')
    order.delivery_photo = url
    order.save(update_fields=['delivery_photo'])
    return order


# ── Buyer ─────────────────────────────────────────────────────

def has_open_problem(order: Order) -> bool:
    return order.problems.filter(status='open').exists()


@transaction.atomic
def confirm(*, buyer: User, order: Order) -> Order:
    if order.buyer_id != buyer.pk:
        raise PermissionDenied('This is not your order.')
    if order.status != 'delivered':
        raise ValidationError({'error': 'Only delivered orders can be confirmed.'})
    if has_open_problem(order):
        raise ValidationError({'error': 'You reported a problem on this order; VUNA will resolve it.'})
    order = fulfilment.advance(actor=buyer, order=order, to='completed', note='Buyer confirmed receipt')
    order.confirmed_at = timezone.now()
    order.save(update_fields=['confirmed_at'])
    return order


@transaction.atomic
def report_problem(*, request, order: Order, reason: str, description: str, photo) -> Problem:
    buyer = request.user
    if order.buyer_id != buyer.pk:
        raise PermissionDenied('This is not your order.')
    if order.status != 'delivered':
        raise ValidationError({'error': 'You can report a problem once the order is delivered and before you confirm it.'})
    if has_open_problem(order):
        raise ValidationError({'error': 'You already reported a problem on this order.'})
    url = save_photo(request, photo, 'problems')
    problem = Problem.objects.create(order=order, buyer=buyer, reason=reason, description=description, photo=url)
    fulfilment.log(order, 'problem', buyer, f'Problem reported: {problem.get_reason_display()}')
    return problem


# ── Admin ─────────────────────────────────────────────────────

@transaction.atomic
def decide(*, actor: User, problem: Problem, decision: str, fault: str, amount: Decimal | None, note: str) -> Problem:
    problem = Problem.objects.select_for_update().select_related('order').get(pk=problem.pk)
    if problem.status != 'open':
        raise ValidationError({'error': 'This problem has already been decided.'})
    order = problem.order
    if decision == 'refund':
        amount = order.total_price if amount is None else amount
        if amount <= 0 or amount > order.total_price:
            raise ValidationError({'amount': [f'Refund between KSh 0.01 and KSh {order.total_price}.']})
        problem.status, problem.refund_amount, problem.fault = 'refunded', amount, fault
        if fault == 'farmer':
            problem.farmer_deduction = farmer_share_of_refund(amount, order.total_price, order.farmer_earnings or 0)
        order.refund_amount = amount
        order.save(update_fields=['refund_amount'])
    else:
        problem.status = 'rejected'
    problem.admin_note, problem.decided_by, problem.decided_at = note[:255], actor, timezone.now()
    problem.save()
    fulfilment.log(order, f'problem_{problem.status}', actor, note)
    if order.status == 'delivered':
        fulfilment.advance(actor=actor, order=order, to='completed', note=f'Problem #{problem.id} {problem.status}')
    return problem


# ── Delivery chat ─────────────────────────────────────────────

def chat_parties(order: Order) -> tuple[User | None, User]:
    driver = order.trip.driver if order.trip_id and order.trip.status != 'cancelled' else None
    return driver, order.buyer


def chat_other_party(user: User, order: Order) -> User:
    driver, buyer = chat_parties(order)
    if driver is not None and user.pk == driver.pk:
        return buyer
    if user.pk == buyer.pk and driver is not None:
        return driver
    raise PermissionDenied('Only the driver and the buyer can see this delivery chat.')


def chat_open(order: Order) -> bool:
    return order.status in ('assigned', 'collected', 'in_transit', 'delivered')


def chat_messages(user: User, order: Order):
    chat_other_party(user, order)  # permission check
    messages = ChatMessage.objects.filter(order=order).select_related('sender').order_by('timestamp')
    messages.filter(~Q(sender=user), is_read=False).update(is_read=True)
    return messages


def send_chat(user: User, order: Order, text: str) -> ChatMessage:
    other = chat_other_party(user, order)
    if not chat_open(order):
        raise ValidationError({'error': 'This delivery is finished; the chat is closed.'})
    return ChatMessage.objects.create(sender=user, receiver=other, order=order, message=text.strip())
