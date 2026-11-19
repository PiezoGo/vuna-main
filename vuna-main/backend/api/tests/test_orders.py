from decimal import Decimal

from django.test import TestCase

from .factories import client_for, make_product, make_user


class OrderTests(TestCase):
    def setUp(self):
        self.farmer = make_user('farmer')
        self.buyer = make_user('buyer')
        self.product = make_product(self.farmer, base='100.00', quantity=10)

    def place(self, user, quantity=2, **extra):
        return client_for(user).post('/api/orders/', {'product': self.product.id, 'quantity': quantity, **extra})

    def test_buyer_places_order_with_server_pricing(self):
        res = self.place(self.buyer, quantity=3, status='completed', farmer_paid=True, total_price='1')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'pending')
        self.assertFalse(res.data['farmer_paid'])
        self.assertEqual(Decimal(res.data['total_price']), Decimal('360.00'))
        self.assertEqual(Decimal(res.data['platform_fee']), Decimal('24.00'))
        self.assertEqual(Decimal(res.data['farmer_earnings']), Decimal('276.00'))
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 7)

    def test_only_buyers_can_order(self):
        for role in ('farmer', 'driver', 'admin'):
            self.assertEqual(self.place(make_user(role)).status_code, 403, role)

    def test_rejects_bad_quantities_and_overselling(self):
        self.assertEqual(self.place(self.buyer, quantity=0).status_code, 400)
        self.assertEqual(self.place(self.buyer, quantity='abc').status_code, 400)
        self.assertEqual(self.place(self.buyer, quantity=11).status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 10)

    def test_rejects_inactive_product(self):
        self.product.is_active = False
        self.product.save()
        self.assertEqual(self.place(self.buyer).status_code, 400)

    def test_orders_cannot_be_edited_or_deleted_through_the_api(self):
        order_id = self.place(self.buyer).data['id']
        c = client_for(self.buyer)
        self.assertEqual(c.patch(f'/api/orders/{order_id}/', {'status': 'completed'}).status_code, 405)
        self.assertEqual(c.delete(f'/api/orders/{order_id}/').status_code, 405)

    def test_users_only_see_their_own_orders(self):
        order_id = self.place(self.buyer).data['id']
        self.assertEqual(client_for(make_user('buyer')).get(f'/api/orders/{order_id}/').status_code, 404)
        self.assertEqual(client_for(self.farmer).get(f'/api/orders/{order_id}/').status_code, 200)

    def test_mock_payment_still_works(self):
        order_id = self.place(self.buyer).data['id']
        res = client_for(self.buyer).post(f'/api/orders/{order_id}/mock_pay/', {'code': '123456'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['order']['status'], 'paid')
