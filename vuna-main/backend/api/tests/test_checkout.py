from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from api.checkout import expire_stale
from api.models import DeliveryAddress, Order, Product

from .factories import client_for, make_product, make_user


class CheckoutTestBase(TestCase):
    def setUp(self):
        self.buyer = make_user('buyer')
        self.farmer_a = make_user('farmer')
        self.farmer_b = make_user('farmer')
        self.tomatoes = make_product(self.farmer_a, base='100.00', quantity=50, title='Tomatoes')
        self.kale = make_product(self.farmer_b, base='40.00', quantity=30, title='Kale', min_order_quantity=5)
        self.address = DeliveryAddress.objects.create(
            buyer=self.buyer, label='Kitchen', contact_name='Chef', contact_phone='254711000222',
            area='Westlands', details='Hotel back gate',
        )
        self.api = client_for(self.buyer)
        self.tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()

    def checkout(self, payment_choice='pay_now', items=None):
        items = items or [{'product': self.tomatoes.id, 'quantity': 10}, {'product': self.kale.id, 'quantity': 5}]
        return self.api.post('/api/checkouts/', {
            'items': items, 'address': self.address.id, 'delivery_date': self.tomorrow,
            'payment_choice': payment_choice,
        }, format='json')

    def line(self, checkout, product):
        return Order.objects.get(checkout_id=checkout['id'], product=product)


class QuoteTests(CheckoutTestBase):
    def test_quote_prices_on_the_server_and_flags_problems(self):
        res = client_for().post('/api/checkouts/quote/', {'items': [
            {'product': self.tomatoes.id, 'quantity': 4}, {'product': self.tomatoes.id, 'quantity': 6},
            {'product': self.kale.id, 'quantity': 2},
        ]}, format='json')
        self.assertEqual(res.status_code, 200)
        lines = {line['product']: line for line in res.data['lines']}
        self.assertEqual(lines[self.tomatoes.id]['quantity'], 10)  # merged
        self.assertEqual(Decimal(lines[self.tomatoes.id]['total']), Decimal('1200.00'))
        self.assertIn('minimum', lines[self.kale.id]['error'])
        self.assertFalse(res.data['ok'])


class CreateCheckoutTests(CheckoutTestBase):
    def test_creates_one_order_per_line_and_reserves_stock(self):
        res = self.checkout()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(len(res.data['lines']), 2)
        self.assertEqual(Decimal(res.data['total']), Decimal('1440.00'))  # 1200 + 5*48
        self.assertEqual(res.data['state'], 'awaiting_payment')
        self.tomatoes.refresh_from_db()
        self.assertEqual(self.tomatoes.quantity, 40)

    def test_rejects_bad_carts(self):
        self.assertEqual(self.checkout(items=[{'product': self.kale.id, 'quantity': 2}]).status_code, 400)
        self.assertEqual(self.checkout(items=[{'product': self.tomatoes.id, 'quantity': 51}]).status_code, 400)
        today = self.api.post('/api/checkouts/', {
            'items': [{'product': self.tomatoes.id, 'quantity': 1}], 'address': self.address.id,
            'delivery_date': timezone.localdate().isoformat(), 'payment_choice': 'pay_now',
        }, format='json')
        self.assertEqual(today.status_code, 400)
        other = DeliveryAddress.objects.create(buyer=make_user('buyer'), label='x', contact_name='x',
                                               contact_phone='254700000000', area='x', details='x')
        res = self.api.post('/api/checkouts/', {
            'items': [{'product': self.tomatoes.id, 'quantity': 1}], 'address': other.id,
            'delivery_date': self.tomorrow, 'payment_choice': 'pay_now',
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Product.objects.get(pk=self.tomatoes.pk).quantity, 50)

    def test_only_buyers_check_out_and_see_their_own(self):
        res = client_for(self.farmer_a).post('/api/checkouts/', {}, format='json')
        self.assertEqual(res.status_code, 403)
        checkout = self.checkout().data
        self.assertEqual(client_for(make_user('buyer')).get(f"/api/checkouts/{checkout['id']}/").status_code, 404)


class PayNowTests(CheckoutTestBase):
    def test_pay_now_then_decline_refunds_that_line(self):
        checkout = self.checkout('pay_now').data
        payment = self.api.post(f"/api/checkouts/{checkout['id']}/pay/")
        self.assertEqual(payment.status_code, 201, payment.data)
        self.assertEqual(payment.data['status'], 'paid')
        self.assertTrue(payment.data['simulated'])
        paid = self.api.get(f"/api/checkouts/{checkout['id']}/")
        self.assertEqual(Decimal(paid.data['amount_paid']), Decimal('1440.00'))
        self.assertEqual(paid.data['state'], 'awaiting_farmers')

        tomatoes = self.line(checkout, self.tomatoes)
        kale = self.line(checkout, self.kale)
        res = client_for(self.farmer_a).post(f'/api/orders/{tomatoes.id}/accept/')
        self.assertEqual(res.data['status'], 'paid')
        res = client_for(self.farmer_b).post(f'/api/orders/{kale.id}/decline/')
        self.assertEqual(res.data['status'], 'declined')
        self.assertTrue(res.data['refunded'])
        self.kale.refresh_from_db()
        self.assertEqual(self.kale.quantity, 30)

        final = self.api.get(f"/api/checkouts/{checkout['id']}/").data
        self.assertEqual(final['state'], 'paid')
        self.assertEqual(Decimal(final['amount_refunded']), Decimal('240.00'))
        self.assertEqual(Decimal(final['total']), Decimal('1200.00'))


class PayAfterTests(CheckoutTestBase):
    def test_pay_after_waits_for_every_farmer_and_charges_only_accepted(self):
        checkout = self.checkout('pay_after').data
        self.assertFalse(checkout['can_pay'])
        self.assertEqual(self.api.post(f"/api/checkouts/{checkout['id']}/pay/").status_code, 400)

        client_for(self.farmer_a).post(f'/api/orders/{self.line(checkout, self.tomatoes).id}/accept/')
        self.assertEqual(self.api.post(f"/api/checkouts/{checkout['id']}/pay/").status_code, 400)
        client_for(self.farmer_b).post(f'/api/orders/{self.line(checkout, self.kale).id}/decline/')

        ready = self.api.get(f"/api/checkouts/{checkout['id']}/").data
        self.assertTrue(ready['can_pay'])
        self.assertEqual(Decimal(ready['amount_due']), Decimal('1200.00'))
        self.assertEqual(self.api.post(f"/api/checkouts/{checkout['id']}/pay/").data['amount'], 1200)
        paid = self.api.get(f"/api/checkouts/{checkout['id']}/").data
        self.assertEqual(Decimal(paid['amount_paid']), Decimal('1200.00'))
        self.assertFalse(paid['lines'][0]['refunded'] and paid['lines'][1]['refunded'])
        self.assertEqual(self.line(checkout, self.tomatoes).status, 'paid')


class ExpiryAndPermissionTests(CheckoutTestBase):
    def test_unanswered_lines_expire_after_two_hours_and_restock(self):
        checkout = self.checkout('pay_now').data
        self.api.post(f"/api/checkouts/{checkout['id']}/pay/")
        later = timezone.now() + timedelta(hours=2, minutes=1)
        self.assertEqual(expire_stale(now=later), 2)
        line = self.line(checkout, self.tomatoes)
        self.assertEqual(line.status, 'expired')
        self.assertTrue(line.refunded)
        self.tomatoes.refresh_from_db()
        self.assertEqual(self.tomatoes.quantity, 50)

    def test_accepted_but_unpaid_lines_expire_after_the_payment_window(self):
        checkout = self.checkout('pay_after').data
        client_for(self.farmer_a).post(f'/api/orders/{self.line(checkout, self.tomatoes).id}/accept/')
        client_for(self.farmer_b).post(f'/api/orders/{self.line(checkout, self.kale).id}/accept/')
        with mock.patch('django.utils.timezone.now', return_value=timezone.now() + timedelta(minutes=31)):
            self.assertEqual(expire_stale(), 2)
        self.assertEqual(self.line(checkout, self.kale).status, 'expired')

    def test_farmers_only_answer_their_own_lines(self):
        checkout = self.checkout().data
        kale = self.line(checkout, self.kale)
        self.assertIn(client_for(self.farmer_a).post(f'/api/orders/{kale.id}/accept/').status_code, (403, 404))
        self.assertEqual(self.api.post(f'/api/orders/{kale.id}/accept/').status_code, 403)

    def test_buyer_cancels_unpaid_lines_only(self):
        checkout = self.checkout('pay_after').data
        kale = self.line(checkout, self.kale)
        self.assertEqual(self.api.post(f'/api/orders/{kale.id}/cancel/').data['status'], 'cancelled')
        checkout2 = self.checkout('pay_now', items=[{'product': self.tomatoes.id, 'quantity': 1}]).data
        self.api.post(f"/api/checkouts/{checkout2['id']}/pay/")
        paid_line = self.line(checkout2, self.tomatoes)
        self.assertEqual(self.api.post(f'/api/orders/{paid_line.id}/cancel/').status_code, 400)

    def test_legacy_mock_pay_refuses_cart_orders(self):
        line = self.line(self.checkout().data, self.tomatoes)
        self.assertEqual(self.api.post(f'/api/orders/{line.id}/mock_pay/', {'code': '1'}).status_code, 400)


class AddressTests(CheckoutTestBase):
    def test_buyers_manage_only_their_own_addresses(self):
        res = self.api.post('/api/addresses/', {
            'label': 'Branch', 'contact_name': 'Amina', 'contact_phone': '0722 111 222', 'area': 'Kilimani', 'details': 'Shop 4',
        })
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['contact_phone'], '254722111222')
        self.assertEqual(len(self.api.get('/api/addresses/').data), 2)
        self.assertEqual(client_for(make_user('buyer')).get(f'/api/addresses/{self.address.id}/').status_code, 404)
        self.assertEqual(client_for(self.farmer_a).get('/api/addresses/').status_code, 403)
