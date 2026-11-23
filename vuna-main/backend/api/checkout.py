"""
Cart checkout rules (PRD section 7.2, business-rules.md §3).

One Checkout = one buyer cart. Each product line becomes an Order. Farmers accept or decline
their lines within FARMER_ANSWER_WINDOW. The buyer pays once: straight away ("pay now"), or
after every farmer has answered ("pay after"), within PAYMENT_WINDOW. Payment is simulated
until the Daraja integration (Module 5) replaces `simulate_payment`.
"""
import uuid
from dataclasses import dataclass, field
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Checkout, Order, Product
from .pricing import price_order

FARMER_ANSWER_WINDOW = timedelta(hours=2)
PAYMENT_WINDOW = timedelta(minutes=30)
OPEN_STATES = ('pending', 'accepted')  # lines that may still be bought


@dataclass
class QuoteLine:
    product: Product
    quantity: int
    total: Decimal = Decimal('0')
    error: str = ''


@dataclass
class Quote:
    lines: list[QuoteLine] = field(default_factory=list)

    @property
    def total(self) -> Decimal:
        return sum((line.total for line in self.lines if not line.error), Decimal('0'))

    @property
    def ok(self) -> bool:
        return bool(self.lines) and not any(line.error for line in self.lines)


def _check(product: Product, quantity: int) -> str:
    if not product.is_active or product.farmer.approval_status != 'approved':
        return 'This product is no longer available.'
    if product.quantity <= 0:
        return 'Sold out.'
    if quantity < product.min_order_quantity:
        return f'The minimum order is {product.min_order_quantity} {product.unit}.'
    if quantity > product.quantity:
        return f'Only {product.quantity} {product.unit} available.'
    return ''


def merge_items(items: list[dict]) -> dict[int, int]:
    """Same product twice in a cart → one line with the summed quantity."""
    merged: dict[int, int] = {}
    for item in items:
        merged[item['product']] = merged.get(item['product'], 0) + item['quantity']
    return merged


def quote(items: list[dict]) -> Quote:
    merged = merge_items(items)
    products = Product.objects.select_related('farmer').in_bulk(list(merged))
    result = Quote()
    for product_id, quantity in merged.items():
        product = products.get(product_id)
        if product is None:
            raise ValidationError({'items': [f'Product {product_id} does not exist.']})
        line = QuoteLine(product=product, quantity=quantity, error=_check(product, quantity))
        if not line.error:
            line.total = price_order(product.base_price_per_unit, quantity).buyer_total
        result.lines.append(line)
    return result


def create_checkout(*, buyer, items, address, delivery_date, payment_choice) -> Checkout:
    if delivery_date <= timezone.localdate():
        raise ValidationError({'delivery_date': ['Choose tomorrow or a later date.']})
    merged = merge_items(items)
    with transaction.atomic():
        # Lock products in a fixed order so two checkouts can't deadlock or oversell.
        products = list(
            Product.objects.select_for_update().select_related('farmer').filter(id__in=merged).order_by('id')
        )
        if len(products) != len(merged):
            raise ValidationError({'items': ['One of the products no longer exists.']})
        errors = {str(p.id): _check(p, merged[p.id]) for p in products if _check(p, merged[p.id])}
        if errors:
            raise ValidationError({'items': errors})

        checkout = Checkout.objects.create(
            buyer=buyer,
            payment_choice=payment_choice,
            delivery_date=delivery_date,
            contact_name=address.contact_name,
            contact_phone=address.contact_phone,
            area=address.area,
            details=address.details,
            landmark=address.landmark,
        )
        for product in products:
            quantity = merged[product.id]
            pricing = price_order(product.base_price_per_unit, quantity)
            Product.objects.filter(pk=product.pk).update(quantity=F('quantity') - quantity)
            Order.objects.create(
                checkout=checkout,
                product=product,
                buyer=buyer,
                farmer=product.farmer,
                quantity=quantity,
                total_price=pricing.buyer_total,
                logistics_fee=pricing.logistics_fee,
                platform_fee=pricing.platform_fee,
                farmer_earnings=pricing.farmer_earnings,
                status='pending',
            )
    return checkout


def _restock(order: Order) -> None:
    Product.objects.filter(pk=order.product_id).update(quantity=F('quantity') + order.quantity)


def _close_line(order: Order, new_status: str) -> None:
    """Decline, expire or cancel a line: return its stock, refund it if it was paid."""
    order.status = new_status
    order.decided_at = order.decided_at or timezone.now()
    if order.is_paid:
        order.refunded = True  # simulated refund until M-Pesa reversals exist (Module 5)
    order.save(update_fields=['status', 'decided_at', 'refunded'])
    _restock(order)


def _maybe_start_payment_clock(checkout: Checkout | None) -> None:
    """Once no line waits for a farmer, unpaid accepted lines have PAYMENT_WINDOW to be paid."""
    if checkout is None or checkout.pay_deadline:
        return
    if not checkout.orders.filter(status='pending').exists():
        checkout.pay_deadline = timezone.now() + PAYMENT_WINDOW
        checkout.save(update_fields=['pay_deadline'])


def accept(order: Order) -> Order:
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        expire_stale(Order.objects.filter(pk=order.pk))
        order.refresh_from_db()
        if order.status != 'pending':
            raise ValidationError({'error': f'This order is {order.get_status_display().lower()} and can no longer be accepted.'})
        order.status = 'paid' if order.is_paid else 'accepted'
        order.decided_at = timezone.now()
        order.save(update_fields=['status', 'decided_at'])
        _maybe_start_payment_clock(order.checkout)
    return order


def decline(order: Order) -> Order:
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.status != 'pending':
            raise ValidationError({'error': f'This order is {order.get_status_display().lower()} and can no longer be declined.'})
        _close_line(order, 'declined')
        _maybe_start_payment_clock(order.checkout)
    return order


def cancel(order: Order) -> Order:
    """Buyer cancels a line that is not paid yet."""
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        if order.status not in OPEN_STATES or order.is_paid:
            raise ValidationError({'error': 'Only unpaid items that are still open can be cancelled.'})
        _close_line(order, 'cancelled')
        _maybe_start_payment_clock(order.checkout)
    return order


def payable_lines(checkout: Checkout):
    """Lines the next payment covers. Pay after: only once every farmer has answered."""
    lines = checkout.orders.filter(is_paid=False, status__in=OPEN_STATES)
    if checkout.payment_choice == 'pay_after':
        if checkout.orders.filter(status='pending').exists():
            return Order.objects.none()
        lines = lines.filter(status='accepted')
    return lines


def mark_lines_paid(lines, reference: str) -> None:
    """
    Record a confirmed payment on these lines. A line that closed while the buyer was paying
    (declined or expired) is marked paid and refunded, so the money is accounted for.
    """
    for line in lines:
        if line.is_paid:
            continue
        line.is_paid = True
        line.mock_payment_id = reference
        if line.status == 'accepted':
            line.status = 'paid'
        elif line.status in ('declined', 'expired', 'cancelled'):
            line.refunded = True
        line.save(update_fields=['is_paid', 'mock_payment_id', 'status', 'refunded'])


def expire_stale(queryset=None, now=None) -> int:
    """
    Close lines nobody acted on in time: unanswered for FARMER_ANSWER_WINDOW, or accepted
    but unpaid after the checkout's pay_deadline. Safe to call often.
    """
    now = now or timezone.now()
    base = (queryset if queryset is not None else Order.objects.all()).filter(checkout__isnull=False)
    stale = list(
        base.filter(status='pending', created_at__lte=now - FARMER_ANSWER_WINDOW)
        | base.filter(status='accepted', is_paid=False, checkout__pay_deadline__lte=now)
    )
    for order in stale:
        _close_line(order, 'expired')
    for checkout_id in {o.checkout_id for o in stale}:
        _maybe_start_payment_clock(Checkout.objects.get(pk=checkout_id))
    return len(stale)


def checkout_state(checkout: Checkout) -> str:
    """One word for the buyer: what is this checkout waiting for?"""
    statuses = [o.status for o in checkout.orders.all()]
    if 'pending' in statuses and (checkout.payment_choice == 'pay_after' or any(o.is_paid for o in checkout.orders.all())):
        return 'awaiting_farmers'
    if any(o.status in OPEN_STATES and not o.is_paid for o in checkout.orders.all()):
        return 'awaiting_payment'
    if any(o.is_paid and not o.refunded for o in checkout.orders.all()):
        return 'paid'
    return 'closed'
