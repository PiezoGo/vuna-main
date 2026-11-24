"""
After payment: delivery trips, fulfilment steps, farmer payouts and buyer refunds
(PRD sections 6.7, 6.8 and 7.2–7.5). Used by the admin dashboard now and the driver app later.
"""
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from . import events
from .models import Order, OrderEvent, Problem, Trip, User

PAYOUT_PROMISE_HOURS = 4

# Allowed manual/driver steps: from status → to status.
STEPS = {
    'collected': ('paid', 'assigned'),
    'in_transit': ('collected',),
    'delivered': ('collected', 'in_transit'),
    'completed': ('delivered',),
}


def lock_orders(queryset):
    """
    Lock only the order rows. `trip` and `checkout` can be empty, so select_related() makes an
    outer join, and PostgreSQL refuses FOR UPDATE on the nullable side of one (SQLite has no
    row locks, so tests never saw it). Always lock order querysets that join through here.
    """
    return queryset.select_for_update(of=('self',))


def log(order: Order, status: str, actor: User | None, note: str = '') -> None:
    OrderEvent.objects.create(order=order, status=status, actor=actor, note=note[:255])


def _schedulable(order: Order, delivery_date) -> str:
    if order.status != 'paid' or not order.is_paid or order.refunded:
        return f'Order #{order.id} is not paid and confirmed.'
    if order.trip_id and order.trip.status != 'cancelled':
        return f'Order #{order.id} is already on trip #{order.trip_id}.'
    if order.checkout_id and order.checkout.delivery_date != delivery_date:
        return f'Order #{order.id} is for delivery on {order.checkout.delivery_date}.'
    return ''


def _check_driver(driver: User) -> None:
    if driver.role != 'driver' or not driver.is_active or not driver.is_driver_active:
        raise ValidationError({'driver': ['Choose an active driver.']})


@transaction.atomic
def create_trip(*, actor: User, delivery_date, driver: User, order_ids: list[int], notes: str = '') -> Trip:
    _check_driver(driver)
    if len(order_ids) != len(set(order_ids)):
        raise ValidationError({'orders': ['An order is listed twice.']})
    orders = list(lock_orders(Order.objects.select_related('checkout', 'trip').filter(id__in=order_ids)))
    if len(orders) != len(order_ids) or not orders:
        raise ValidationError({'orders': ['Choose paid orders to put on this trip.']})
    errors = [msg for o in orders if (msg := _schedulable(o, delivery_date))]
    if errors:
        raise ValidationError({'orders': errors})
    trip = Trip.objects.create(delivery_date=delivery_date, driver=driver, notes=notes, created_by=actor)
    position = {oid: i for i, oid in enumerate(order_ids)}
    for order in orders:
        order.trip = trip
        order.stop_order = position[order.id]
        order.driver = driver
        order.status = 'assigned'
        order.save(update_fields=['trip', 'stop_order', 'driver', 'status'])
        log(order, 'assigned', actor, f'Trip #{trip.id} with {driver.full_name}')
    events.trip_assigned(trip, orders)
    return trip


@transaction.atomic
def set_trip_orders(*, actor: User, trip: Trip, order_ids: list[int]) -> Trip:
    """Add, remove or reorder the orders on a trip that hasn't started."""
    trip = Trip.objects.select_for_update().get(pk=trip.pk)
    if trip.status != 'planned':
        raise ValidationError({'error': 'Only a planned trip can be changed.'})
    if len(order_ids) != len(set(order_ids)):
        raise ValidationError({'orders': ['An order is listed twice.']})
    current = {o.id: o for o in trip.orders.select_for_update()}
    for oid, order in current.items():
        if oid not in order_ids:
            _unschedule(order, actor, f'Removed from trip #{trip.id}')
    new_ids = [oid for oid in order_ids if oid not in current]
    added = list(lock_orders(Order.objects.select_related('checkout', 'trip').filter(id__in=new_ids)))
    errors = [msg for o in added if (msg := _schedulable(o, trip.delivery_date))]
    if len(added) != len(new_ids):
        errors.append('One of the orders no longer exists.')
    if errors:
        raise ValidationError({'orders': errors})
    for order in added:
        order.trip, order.driver, order.status = trip, trip.driver, 'assigned'
        log(order, 'assigned', actor, f'Added to trip #{trip.id}')
    for i, oid in enumerate(order_ids):
        order = current.get(oid) or next(o for o in added if o.id == oid)
        order.stop_order = i
        order.save(update_fields=['trip', 'driver', 'status', 'stop_order'])
    if not order_ids:
        trip.status = 'cancelled'
        trip.save(update_fields=['status'])
    if added:
        events.trip_assigned(trip, added)
    else:
        events.trip_changed(trip, cancelled=not order_ids)
    return trip


def _unschedule(order: Order, actor: User, note: str) -> None:
    order.trip, order.driver, order.status, order.stop_order = None, None, 'paid', 0
    order.save(update_fields=['trip', 'driver', 'status', 'stop_order'])
    log(order, 'paid', actor, note)


@transaction.atomic
def cancel_trip(*, actor: User, trip: Trip) -> Trip:
    trip = Trip.objects.select_for_update().get(pk=trip.pk)
    if trip.status in ('done', 'cancelled'):
        raise ValidationError({'error': f'This trip is already {trip.get_status_display().lower()}.'})
    if trip.orders.filter(collected_at__isnull=False).exists():
        raise ValidationError({'error': 'Produce has already been collected on this trip; finish it instead.'})
    for order in trip.orders.select_for_update():
        _unschedule(order, actor, f'Trip #{trip.id} cancelled')
    trip.status = 'cancelled'
    trip.save(update_fields=['status'])
    events.trip_changed(trip, cancelled=True)
    return trip


@transaction.atomic
def advance(*, actor: User, order: Order, to: str, note: str = '') -> Order:
    """Move an order line one fulfilment step (collected → in transit → delivered → completed)."""
    order = lock_orders(Order.objects.select_related('trip')).get(pk=order.pk)
    allowed_from = STEPS.get(to)
    if allowed_from is None:
        raise ValidationError({'status': [f'Unknown step "{to}".']})
    if order.status not in allowed_from:
        raise ValidationError({'error': f'Order #{order.id} is "{order.get_status_display()}" and can\'t be marked {to.replace("_", " ")}.'})
    now = timezone.now()
    order.status = to
    fields = ['status']
    if to == 'collected':
        order.collected_at = now
        fields.append('collected_at')
    if to == 'delivered':
        order.delivered_at = now
        fields.append('delivered_at')
    order.save(update_fields=fields)
    log(order, to, actor, note)
    if to == 'collected':
        events.collected(order)
    elif to == 'delivered':
        events.delivered(order)

    trip = order.trip
    if trip and trip.status != 'cancelled':
        statuses = set(trip.orders.values_list('status', flat=True))
        new_status = 'done' if statuses <= {'delivered', 'completed'} else 'in_progress'
        if trip.status != new_status:
            trip.status = new_status
            trip.save(update_fields=['status'])
    return order


def payouts_due():
    return Order.objects.filter(
        is_paid=True, refunded=False, farmer_paid=False, collected_at__isnull=False,
    ).select_related('farmer', 'product').order_by('collected_at')


def payout_rows() -> list[Order]:
    """
    Payouts due, oldest first, each with `deduction` (farmer-fault refunds taken off it, oldest first,
    never more than the payout), `deduction_problems` and `on_hold` (an open problem on the line).
    """
    lines = list(payouts_due().prefetch_related('problems'))
    owed: dict = {}
    for problem in Problem.objects.filter(
        fault='farmer', status='refunded', farmer_deduction__gt=0, deducted_on__isnull=True,
    ).select_related('order').order_by('decided_at', 'id'):
        owed.setdefault(problem.order.farmer_id, []).append(problem)
    for line in lines:
        earnings = line.farmer_earnings or Decimal('0')
        taken, used = Decimal('0'), []
        for problem in list(owed.get(line.farmer_id, [])):
            if taken + problem.farmer_deduction <= earnings:
                taken += problem.farmer_deduction
                used.append(problem)
                owed[line.farmer_id].remove(problem)
        line.deduction, line.deduction_problems = taken, used
        line.on_hold = any(p.status == 'open' for p in line.problems.all())
    return lines


def refunds_due():
    return Order.objects.filter(
        Q(refunded=True) | Q(refund_amount__isnull=False), refunded_at__isnull=True,
    ).select_related('buyer', 'product').order_by('created_at')


@transaction.atomic
def record_payout(*, actor: User, order: Order, reference: str) -> Order:
    order = Order.objects.select_for_update().get(pk=order.pk)
    line = next((row for row in payout_rows() if row.pk == order.pk), None)
    if line is None:
        raise ValidationError({'error': 'This order has no payout due (not collected yet, refunded, or already paid out).'})
    order.farmer_paid = True
    order.payout_reference = reference.strip().upper()
    order.paid_out_at = timezone.now()
    order.payout_deduction = line.deduction
    order.save(update_fields=['farmer_paid', 'payout_reference', 'paid_out_at', 'payout_deduction'])
    Problem.objects.filter(pk__in=[p.pk for p in line.deduction_problems]).update(deducted_on=order)
    note = f' less KSh {line.deduction} for refunds' if line.deduction else ''
    log(order, 'paid_out', actor, f'Payout {order.payout_reference}{note}')
    events.payout_sent(order)
    return order


@transaction.atomic
def record_refund(*, actor: User, order: Order, reference: str) -> Order:
    order = Order.objects.select_for_update().get(pk=order.pk)
    if not refunds_due().filter(pk=order.pk).exists():
        raise ValidationError({'error': 'This order has no refund to send.'})
    order.refund_reference = reference.strip().upper()
    order.refunded_at = timezone.now()
    order.save(update_fields=['refund_reference', 'refunded_at'])
    log(order, 'refund_sent', actor, f'Refund {order.refund_reference}')
    events.refund_sent(order)
    return order
