"""
Bell items and sidebar badge counts (Module 10).

notify() records a bell item and pushes it live. summary() counts what is waiting for a user
right now from existing data, keyed by the sidebar link it belongs to.
"""
import logging
from datetime import timedelta

from django.utils import timezone

from . import realtime
from .models import ChatMessage, Notification, Order, Problem, User

log = logging.getLogger(__name__)

ANSWER_URGENT = timedelta(minutes=30)
CONFIRM_REMINDER = timedelta(hours=24)


def notify(user: User | None, kind: str, title: str, body: str = '', link: str = '') -> None:
    """Save a bell item for `user` and push it live. Never raises: the action that caused it matters more."""
    if user is None:
        return
    try:
        n = Notification.objects.create(user=user, kind=kind, title=title[:140], body=body[:255], link=link[:200])
    except Exception:  # noqa: BLE001
        log.exception('Could not save notification %s for %s', kind, user.pk)
        return
    realtime.push_user(user.pk, {
        'type': 'notification',
        'notification': {
            'id': n.id, 'kind': kind, 'title': n.title, 'body': n.body, 'link': n.link,
            'read_at': None, 'created_at': n.created_at.isoformat(),
        },
    })


def notify_admins(kind: str, title: str, body: str = '', link: str = '') -> None:
    for admin in User.objects.filter(role='admin', is_active=True):
        notify(admin, kind, title, body, link)


def order_link(user: User, order: Order) -> str:
    """Where a bell item about this order line takes each role."""
    if user.role == 'buyer':
        return f'/orders/{order.checkout_id}' if order.checkout_id else '/orders'
    if user.role == 'farmer':
        return '/farmer/orders'
    if user.role == 'driver':
        return f'/driver/stops/{order.id}?kind=dropoff' if order.status != 'assigned' else '/driver'
    if user.role == 'agent':
        return f'/agent/farmers/{order.farmer_id}'
    return f'/admin/orders?q=%23{order.id}'


def describe(order: Order) -> str:
    return f'{order.quantity} {order.product.unit} {order.product.title}'


def _badge(count: int, urgent: bool = False) -> dict:
    return {'count': count, 'urgent': urgent}


def summary(user: User) -> dict:
    now = timezone.now()
    badges: dict[str, dict] = {}
    unread_messages = ChatMessage.objects.filter(receiver=user, is_read=False).count()
    if user.role == 'farmer':
        from .checkout import FARMER_ANSWER_WINDOW
        waiting = Order.objects.filter(farmer=user, status='pending', checkout__isnull=False)
        urgent = waiting.filter(created_at__lte=now - FARMER_ANSWER_WINDOW + ANSWER_URGENT).exists()
        badges['/farmer/orders'] = _badge(waiting.count(), urgent)
    elif user.role == 'buyer':
        to_confirm = Order.objects.filter(buyer=user, status='delivered').exclude(problems__status='open')
        to_pay = Order.objects.filter(buyer=user, status='accepted', is_paid=False)
        badges['/orders'] = _badge(to_confirm.count() + to_pay.count(), to_pay.exists())
    elif user.role == 'driver':
        stops = Order.objects.filter(
            trip__driver=user, trip__delivery_date__gte=timezone.localdate(),
            status__in=('assigned', 'collected', 'in_transit'),
        ).exclude(trip__status='cancelled')
        badges['/driver'] = _badge(stops.count())
    elif user.role == 'agent':
        badges['/agent'] = _badge(Order.objects.filter(farmer__agent=user, status='pending').count())
    elif user.role == 'admin':
        from . import fulfilment
        due = fulfilment.payouts_due()
        overdue = due.filter(collected_at__lt=now - timedelta(hours=fulfilment.PAYOUT_PROMISE_HOURS)).exists()
        badges.update({
            '/admin/trips': _badge(Order.objects.filter(status='paid', is_paid=True, refunded=False, trip__isnull=True).count()),
            '/admin/payouts': _badge(due.count(), overdue),
            '/admin/refunds': _badge(fulfilment.refunds_due().count()),
            '/admin/problems': _badge(Problem.objects.filter(status='open').count(), True),
            '/admin/farmers': _badge(User.objects.filter(role='farmer', approval_status='pending', is_active=True).count()),
            '/admin/orders': _badge(Order.objects.filter(status='delivered', delivered_at__lt=now - CONFIRM_REMINDER).count()),
        })
    badges['/messages'] = _badge(unread_messages)
    badges = {href: b for href, b in badges.items() if b['count'] > 0}
    return {
        'badges': badges,
        'unread': Notification.objects.filter(user=user, read_at__isnull=True).count(),
        'messages': unread_messages,
    }


def mark_read(user: User, ids: list[int] | None = None) -> int:
    qs = Notification.objects.filter(user=user, read_at__isnull=True)
    if ids is not None:
        qs = qs.filter(id__in=ids)
    count = qs.update(read_at=timezone.now())
    realtime.badges_changed(user.pk)
    return count


def prune(days: int = 60) -> int:
    cutoff = timezone.now() - timedelta(days=days)
    return Notification.objects.filter(read_at__isnull=False, created_at__lt=cutoff).delete()[0]

