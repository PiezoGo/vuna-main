import os
from datetime import timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from api import mpesa
from api.models import DeliveryAddress, MpesaPayment, Order

from .factories import client_for, make_product, make_user

LIVE_ENV = {
    'MPESA_ENV': 'sandbox',
    'MPESA_CONSUMER_KEY': 'key',
    'MPESA_CONSUMER_SECRET': 'secret',
    'MPESA_SHORTCODE': '174379',
    'MPESA_PASSKEY': 'passkey',
    'MPESA_CALLBACK_TOKEN': 'cb-token-123',
    'MPESA_CALLBACK_BASE': 'https://api.example.test',
}


def callback(request_id, code=0, amount=1201, receipt='SKA1B2C3D4'):
    body = {'Body': {'stkCallback': {
        'MerchantRequestID': 'm-1', 'CheckoutRequestID': request_id, 'ResultCode': code,
        'ResultDesc': 'The service request is processed successfully.' if code == 0 else 'Request cancelled by user',
    }}}
    if code == 0:
        body['Body']['stkCallback']['CallbackMetadata'] = {'Item': [
            {'Name': 'Amount', 'Value': amount},
            {'Name': 'MpesaReceiptNumber', 'Value': receipt},
            {'Name': 'PhoneNumber', 'Value': 254712000111},
        ]}
    return body


@mock.patch.dict(os.environ, LIVE_ENV)
class StkPushTests(TestCase):
    def setUp(self):
        self.buyer = make_user('buyer')
        farmer = make_user('farmer')
        # base 1000.42 → listed 1200.50 per unit: tests rounding up to whole shillings
        self.product = make_product(farmer, base='1000.42', quantity=10)
        address = DeliveryAddress.objects.create(buyer=self.buyer, label='K', contact_name='C', contact_phone='254711000222', area='A', details='D')
        self.api = client_for(self.buyer)
        res = self.api.post('/api/checkouts/', {
            'items': [{'product': self.product.id, 'quantity': 1}], 'address': address.id,
            'delivery_date': (timezone.localdate() + timedelta(days=1)).isoformat(), 'payment_choice': 'pay_now',
        }, format='json')
        self.checkout_id = res.data['id']

    def start(self, **body):
        with mock.patch.object(mpesa, 'stk_push', return_value={'MerchantRequestID': 'm-1', 'CheckoutRequestID': 'ws_CO_1', 'ResponseCode': '0'}) as push:
            res = self.api.post(f'/api/checkouts/{self.checkout_id}/pay/', body, format='json')
        return res, push

    def test_sends_prompt_with_rounded_amount_and_chosen_phone(self):
        res, push = self.start(phone='0722 333 444')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['status'], 'requested')
        self.assertFalse(res.data['simulated'])
        self.assertEqual(res.data['amount'], 1201)
        push.assert_called_once()
        self.assertEqual(push.call_args.kwargs['phone'], '254722333444')
        self.assertEqual(push.call_args.kwargs['amount'], 1201)
        self.assertFalse(Order.objects.get(checkout_id=self.checkout_id).is_paid)

    def test_does_not_send_a_second_prompt_while_one_is_open(self):
        first, _ = self.start()
        second, push = self.start()
        self.assertEqual(second.data['id'], first.data['id'])
        push.assert_not_called()

    def test_successful_callback_marks_lines_paid_once(self):
        payment_id = self.start()[0].data['id']
        url = '/api/payments/mpesa/callback/cb-token-123/'
        self.assertEqual(client_for().post(url, callback('ws_CO_1'), format='json').status_code, 200)
        client_for().post(url, callback('ws_CO_1', receipt='OTHER'), format='json')  # duplicate ignored
        payment = MpesaPayment.objects.get(pk=payment_id)
        self.assertEqual(payment.status, 'paid')
        self.assertEqual(payment.receipt_number, 'SKA1B2C3D4')
        order = Order.objects.get(checkout_id=self.checkout_id)
        self.assertTrue(order.is_paid)
        self.assertEqual(order.mock_payment_id, 'SKA1B2C3D4')
        status = self.api.get(f'/api/payments/{payment_id}/').data
        self.assertEqual(status['message'], 'Payment received.')

    def test_cancelled_prompt_leaves_order_unpaid_and_allows_retry(self):
        payment_id = self.start()[0].data['id']
        client_for().post('/api/payments/mpesa/callback/cb-token-123/', callback('ws_CO_1', code=1032), format='json')
        self.assertEqual(MpesaPayment.objects.get(pk=payment_id).status, 'failed')
        self.assertIn('cancelled', self.api.get(f'/api/payments/{payment_id}/').data['message'])
        self.assertFalse(Order.objects.get(checkout_id=self.checkout_id).is_paid)
        retry, push = self.start()
        self.assertNotEqual(retry.data['id'], payment_id)
        push.assert_called_once()

    def test_rejects_wrong_token_unknown_request_and_short_amount(self):
        self.start()
        self.assertEqual(client_for().post('/api/payments/mpesa/callback/wrong/', callback('ws_CO_1'), format='json').status_code, 404)
        self.assertEqual(client_for().post('/api/payments/mpesa/callback/cb-token-123/', callback('ws_CO_404'), format='json').status_code, 200)
        client_for().post('/api/payments/mpesa/callback/cb-token-123/', callback('ws_CO_1', amount=1), format='json')
        self.assertEqual(MpesaPayment.objects.get(checkout_request_id='ws_CO_1').status, 'failed')
        self.assertFalse(Order.objects.get(checkout_id=self.checkout_id).is_paid)

    def test_daraja_errors_are_shown_to_the_buyer(self):
        with mock.patch.object(mpesa, 'stk_push', side_effect=mpesa.MpesaError("Couldn't connect to M-Pesa. Please try again.")):
            res = self.api.post(f'/api/checkouts/{self.checkout_id}/pay/', {}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('connect', res.data['error'])

    def test_status_poll_asks_safaricom_when_no_callback_arrives(self):
        payment_id = self.start()[0].data['id']
        MpesaPayment.objects.filter(pk=payment_id).update(created_at=timezone.now() - timedelta(minutes=1))
        with mock.patch.object(mpesa, 'stk_query', return_value={'ResultCode': '2001', 'ResultDesc': 'wrong pin'}):
            res = self.api.get(f'/api/payments/{payment_id}/')
        self.assertEqual(res.data['status'], 'failed')
        self.assertIn('PIN', res.data['message'])

    def test_other_buyers_cannot_see_the_payment(self):
        payment_id = self.start()[0].data['id']
        self.assertEqual(client_for(make_user('buyer')).get(f'/api/payments/{payment_id}/').status_code, 404)


class MpesaClientTests(TestCase):
    @mock.patch.dict(os.environ, LIVE_ENV)
    def test_stk_push_request_shape(self):
        with mock.patch('api.mpesa.requests.get') as get, mock.patch('api.mpesa.requests.post') as post:
            get.return_value.json.return_value = {'access_token': 'tok', 'expires_in': '3599'}
            get.return_value.raise_for_status.return_value = None
            post.return_value.status_code = 200
            post.return_value.json.return_value = {'ResponseCode': '0', 'CheckoutRequestID': 'ws_CO_9'}
            mpesa.cache.clear()
            mpesa.stk_push(phone='254712000111', amount=10, reference='VUNA12345678999', description='VUNA order 12')
        payload = post.call_args.kwargs['json']
        self.assertEqual(post.call_args.args[0], 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest')
        self.assertEqual(payload['BusinessShortCode'], '174379')
        self.assertEqual(payload['TransactionType'], 'CustomerPayBillOnline')
        self.assertEqual(payload['CallBackURL'], 'https://api.example.test/api/payments/mpesa/callback/cb-token-123/')
        self.assertEqual(len(payload['AccountReference']), 12)
        self.assertEqual(post.call_args.kwargs['headers']['Authorization'], 'Bearer tok')

    @mock.patch.dict(os.environ, {'MPESA_ENV': 'sandbox'}, clear=False)
    def test_missing_settings_are_reported(self):
        for key in ('MPESA_CONSUMER_KEY', 'MPESA_PASSKEY'):
            os.environ.pop(key, None)
        with self.assertRaises(mpesa.MpesaError):
            mpesa.config()
