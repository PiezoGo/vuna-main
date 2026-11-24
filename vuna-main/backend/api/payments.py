"""
Buyer payments by M-Pesa Express (STK Push), on top of the checkout rules in checkout.py.

Flow: start_payment() sends a prompt for whatever is payable now → Safaricom calls
apply_callback() → the lines covered by that prompt are marked paid. If the callback never
arrives, refresh() asks Safaricom directly. In simulated mode payments succeed at once.
"""
import logging
import math
import uuid
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from . import events, mpesa
from .checkout import expire_stale, mark_lines_paid, payable_lines
from .models import Checkout, MpesaPayment
from .phone import normalize_ke_phone

log = logging.getLogger(__name__)

REUSE_WINDOW = timedelta(minutes=2)   # don't send a second prompt while one is still open
QUERY_AFTER = timedelta(seconds=45)   # no callback by then → ask Safaricom
GIVE_UP_AFTER = timedelta(minutes=3)  # prompt expired on the phone


def start_payment(checkout: Checkout, phone: str | None = None) -> MpesaPayment:
    number = normalize_ke_phone(phone or checkout.buyer.phone_number)
    if not number:
        raise ValidationError({'phone': ['Enter a Safaricom number, for example 0712 345 678.']})

    with transaction.atomic():
        checkout = Checkout.objects.select_for_update().get(pk=checkout.pk)
        expire_stale(checkout.orders.all())

        open_prompt = checkout.payments.filter(
            status='requested', created_at__gte=timezone.now() - REUSE_WINDOW,
        ).first()
        if open_prompt:
            return open_prompt

        lines = list(payable_lines(checkout))
        if not lines:
            if checkout.payment_choice == 'pay_after' and checkout.orders.filter(status='pending').exists():
                raise ValidationError({'error': 'Wait until every farmer has answered, then pay for what they accepted.'})
            raise ValidationError({'error': 'There is nothing to pay for.'})

        # M-Pesa takes whole shillings: round up, never down.
        amount = math.ceil(sum(line.total_price for line in lines))
        payment = MpesaPayment.objects.create(
            checkout=checkout, phone=number, amount=amount, simulated=mpesa.is_simulated(),
        )
        payment.orders.set(lines)

        if payment.simulated:
            reference = f'SIM{uuid.uuid4().hex[:9].upper()}'
            _settle(payment, code=0, desc='Simulated payment', receipt=reference)
            return payment

    # Outside the transaction: the network call can take seconds.
    try:
        data = mpesa.stk_push(
            phone=number, amount=amount, reference=f'VUNA{checkout.id}', description=f'VUNA order {checkout.id}',
        )
    except mpesa.MpesaError as exc:
        payment.status = 'failed'
        payment.result_desc = str(exc)
        payment.save(update_fields=['status', 'result_desc', 'updated_at'])
        raise ValidationError({'error': str(exc)}) from exc

    payment.merchant_request_id = data.get('MerchantRequestID', '')
    payment.checkout_request_id = data.get('CheckoutRequestID', '')
    payment.save(update_fields=['merchant_request_id', 'checkout_request_id', 'updated_at'])
    return payment


def _settle(payment: MpesaPayment, *, code: int, desc: str, receipt: str = '', raw: dict | None = None) -> None:
    """Apply a final result once. Callers hold a lock on the payment row."""
    if payment.status != 'requested':
        return
    payment.result_code = code
    payment.result_desc = desc[:255]
    payment.receipt_number = receipt
    if raw is not None:
        payment.raw_callback = raw
    if code == 0:
        payment.status = 'paid'
        mark_lines_paid(list(payment.orders.select_for_update()), receipt or payment.checkout_request_id)
        checkout = payment.checkout
        checkout.payment_reference = receipt or payment.checkout_request_id
        checkout.paid_at = timezone.now()
        checkout.save(update_fields=['payment_reference', 'paid_at'])
        events.payment_received(checkout, payment.amount)
    else:
        payment.status = 'failed'
    payment.save()


def _metadata(callback: dict) -> dict:
    items = (callback.get('CallbackMetadata') or {}).get('Item') or []
    return {item.get('Name'): item.get('Value') for item in items if isinstance(item, dict)}


def apply_callback(body: dict) -> bool:
    """
    Handle Safaricom's STK callback. Returns False when it doesn't match a payment we sent.
    Duplicate callbacks are ignored.
    """
    callback = (body or {}).get('Body', {}).get('stkCallback') or {}
    request_id = callback.get('CheckoutRequestID')
    if not request_id:
        return False
    with transaction.atomic():
        payment = MpesaPayment.objects.select_for_update().filter(checkout_request_id=request_id).first()
        if payment is None:
            log.warning('M-Pesa callback for unknown CheckoutRequestID %s', request_id)
            return False
        code = int(callback.get('ResultCode', -1))
        desc = callback.get('ResultDesc', '')
        meta = _metadata(callback)
        if code == 0 and int(math.floor(float(meta.get('Amount') or 0))) < payment.amount:
            log.error('M-Pesa amount mismatch for payment %s: %s', payment.id, meta.get('Amount'))
            code, desc = -2, 'Amount paid did not match the amount requested.'
        _settle(payment, code=code, desc=desc, receipt=str(meta.get('MpesaReceiptNumber') or ''), raw=body)
    return True


def refresh(payment: MpesaPayment) -> MpesaPayment:
    """For a prompt still open: ask Safaricom after a while, give up after GIVE_UP_AFTER."""
    if payment.status != 'requested' or payment.simulated or not payment.checkout_request_id:
        return payment
    age = timezone.now() - payment.created_at
    if age < QUERY_AFTER:
        return payment
    try:
        data = mpesa.stk_query(payment.checkout_request_id)
    except mpesa.MpesaError:
        data = {}
    with transaction.atomic():
        payment = MpesaPayment.objects.select_for_update().get(pk=payment.pk)
        if 'ResultCode' in data:
            _settle(payment, code=int(data['ResultCode']), desc=data.get('ResultDesc', ''))
        elif age >= GIVE_UP_AFTER:
            _settle(payment, code=1037, desc='No answer from the phone in time.')
    payment.refresh_from_db()
    return payment
