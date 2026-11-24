from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from api.models import Checkout, Order, OrderEvent, Trip
from api.pricing import price_order

from .factories import client_for, make_product, make_user

TOMORROW = date.today() + timedelta(days=1)


def make_line(buyer, farmer, *, delivery=TOMORROW, status='paid', is_paid=True, refunded=False, qty=10):
    product = make_product(farmer)
    checkout = Checkout.objects.create(
        buyer=buyer, payment_choice='pay_now', delivery_date=delivery,
        contact_name='Chef', contact_phone='254700000001', area='Westlands', details='Gate 2',
    )
    prices = price_order(product.base_price_per_unit, qty)
    return Order.objects.create(
        product=product, buyer=buyer, farmer=farmer, quantity=qty, checkout=checkout,
        total_price=prices.buyer_total, logistics_fee=prices.logistics_fee,
        platform_fee=prices.platform_fee, farmer_earnings=prices.farmer_earnings,
        status=status, is_paid=is_paid, refunded=refunded,
    )


class AdminOpsBase(TestCase):
    def setUp(self):
        self.admin = make_user('admin')
        self.api = client_for(self.admin)
        self.buyer = make_user('buyer')
        self.farmer = make_user('farmer')
        self.driver = make_user('driver')
        self.a = make_line(self.buyer, self.farmer)
        self.b = make_line(self.buyer, self.farmer)

    def create_trip(self, orders, driver=None, day=TOMORROW):
        return self.api.post('/api/admin/trips/', {
            'delivery_date': day.isoformat(), 'driver': str((driver or self.driver).uid), 'orders': orders,
        }, format='json')


class TripTests(AdminOpsBase):
    def test_create_trip_schedules_paid_lines(self):
        res = self.create_trip([self.b.id, self.a.id])
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual([s['id'] for s in res.data['stops']], [self.b.id, self.a.id])
        self.a.refresh_from_db()
        self.assertEqual(self.a.status, 'assigned')
        self.assertEqual(self.a.driver, self.driver)
        self.assertTrue(OrderEvent.objects.filter(order=self.a, status='assigned', actor=self.admin).exists())
        # The buyer sees the line as assigned with the driver.
        mine = client_for(self.buyer).get(f'/api/orders/{self.a.id}/').data
        self.assertEqual(mine['status'], 'assigned')

    def test_rejects_unpaid_other_date_already_scheduled_and_inactive_driver(self):
        unpaid = make_line(self.buyer, self.farmer, status='accepted', is_paid=False)
        later = make_line(self.buyer, self.farmer, delivery=TOMORROW + timedelta(days=1))
        self.assertEqual(self.create_trip([self.a.id, unpaid.id]).status_code, 400)
        self.assertEqual(self.create_trip([self.a.id, later.id]).status_code, 400)
        self.assertEqual(self.create_trip([self.a.id, self.a.id]).status_code, 400)
        self.assertEqual(self.create_trip([self.a.id], driver=self.farmer).status_code, 400)
        self.assertEqual(self.create_trip([self.a.id]).status_code, 201)
        self.assertEqual(self.create_trip([self.a.id]).status_code, 400)  # already on a trip
        self.a.refresh_from_db()
        unpaid.refresh_from_db()
        self.assertEqual(unpaid.status, 'accepted')

    def test_several_trips_per_driver_per_day_allowed(self):
        self.assertEqual(self.create_trip([self.a.id]).status_code, 201)
        self.assertEqual(self.create_trip([self.b.id]).status_code, 201)

    def test_cancel_returns_lines_to_paid(self):
        trip_id = self.create_trip([self.a.id, self.b.id]).data['id']
        res = self.api.post(f'/api/admin/trips/{trip_id}/cancel/')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['status'], 'cancelled')
        for line in (self.a, self.b):
            line.refresh_from_db()
            self.assertEqual((line.status, line.trip_id, line.driver_id), ('paid', None, None))
        # Back in the pool for a new trip.
        self.assertEqual(self.create_trip([self.a.id]).status_code, 201)

    def test_cannot_cancel_after_collection(self):
        trip_id = self.create_trip([self.a.id, self.b.id]).data['id']
        self.api.post(f'/api/admin/orders/{self.a.id}/step/', {'status': 'collected'}, format='json')
        self.assertEqual(self.api.post(f'/api/admin/trips/{trip_id}/cancel/').status_code, 400)

    def test_set_orders_removes_and_reorders(self):
        c = make_line(self.buyer, self.farmer)
        trip_id = self.create_trip([self.a.id, self.b.id]).data['id']
        res = self.api.put(f'/api/admin/trips/{trip_id}/orders/', {'orders': [c.id, self.a.id]}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual([s['id'] for s in res.data['stops']], [c.id, self.a.id])
        self.b.refresh_from_db()
        self.assertEqual(self.b.status, 'paid')

    def test_steps_move_trip_and_start_payout_clock(self):
        trip_id = self.create_trip([self.a.id]).data['id']
        step = lambda s: self.api.post(f'/api/admin/orders/{self.a.id}/step/', {'status': s}, format='json')
        self.assertEqual(step('delivered').status_code, 400)  # must be collected first
        self.assertEqual(step('collected').status_code, 200)
        self.assertEqual(Trip.objects.get(pk=trip_id).status, 'in_progress')
        payouts = self.api.get('/api/admin/payouts/').data
        self.assertEqual([p['id'] for p in payouts], [self.a.id])
        self.assertGreater(payouts[0]['minutes_left'], 230)
        self.assertEqual(Decimal(payouts[0]['farmer_earnings']), Decimal('920.00'))
        self.assertEqual(step('delivered').status_code, 200)
        self.assertEqual(Trip.objects.get(pk=trip_id).status, 'done')
        self.assertEqual(step('completed').status_code, 200)
        self.assertEqual(
            list(OrderEvent.objects.filter(order=self.a).values_list('status', flat=True)),
            ['assigned', 'collected', 'delivered', 'completed'],
        )


class MoneyRecordTests(AdminOpsBase):
    def test_record_payout(self):
        self.assertEqual(self.api.post(f'/api/admin/payouts/{self.a.id}/record/', {'reference': 'SKA1B2C3D4'}).status_code, 400)
        self.api.post(f'/api/admin/orders/{self.a.id}/step/', {'status': 'collected'}, format='json')
        self.assertEqual(self.api.post(f'/api/admin/payouts/{self.a.id}/record/', {'reference': 'no!'}).status_code, 400)
        res = self.api.post(f'/api/admin/payouts/{self.a.id}/record/', {'reference': 'ska1b2c3d4'})
        self.assertEqual(res.status_code, 200, res.data)
        self.a.refresh_from_db()
        self.assertTrue(self.a.farmer_paid)
        self.assertEqual(self.a.payout_reference, 'SKA1B2C3D4')
        self.assertEqual(self.api.get('/api/admin/payouts/').data, [])
        self.assertEqual(self.api.post(f'/api/admin/payouts/{self.a.id}/record/', {'reference': 'SKA1B2C3D5'}).status_code, 400)

    def test_overdue_payout_is_negative(self):
        Order.objects.filter(pk=self.a.pk).update(status='collected', collected_at=timezone.now() - timedelta(hours=5))
        line = self.api.get('/api/admin/payouts/').data[0]
        self.assertLess(line['minutes_left'], 0)
        self.assertEqual(self.api.get('/api/admin/overview/').data['payouts_overdue'], 1)

    def test_record_refund(self):
        declined = make_line(self.buyer, self.farmer, status='declined', refunded=True)
        refunds = self.api.get('/api/admin/refunds/').data
        self.assertEqual([r['id'] for r in refunds], [declined.id])
        self.assertEqual(self.api.post(f'/api/admin/refunds/{self.a.id}/record/', {'reference': 'SKR1B2C3D4'}).status_code, 400)
        res = self.api.post(f'/api/admin/refunds/{declined.id}/record/', {'reference': 'SKR1B2C3D4'})
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.api.get('/api/admin/refunds/').data, [])


class OverviewAndUsersTests(AdminOpsBase):
    def test_overview_counts(self):
        make_line(self.buyer, self.farmer, status='pending', is_paid=False)
        make_user('farmer', approval_status='pending')
        data = self.api.get('/api/admin/overview/').data
        self.assertEqual(data['paid_without_trip'], 2)
        self.assertEqual(data['waiting_for_farmers'], 1)
        self.assertEqual(data['pending_farmers'], 1)
        self.assertEqual(data['week_orders'], 2)
        self.assertEqual(Decimal(data['week_gmv']), Decimal('2400.00'))

    def test_orders_filters(self):
        other_buyer = make_user('buyer')
        make_line(other_buyer, self.farmer, delivery=TOMORROW + timedelta(days=2))
        res = self.api.get('/api/admin/orders/', {'buyer': str(self.buyer.uid), 'date': TOMORROW.isoformat()})
        self.assertEqual(len(res.data), 2)
        self.assertEqual(self.api.get('/api/admin/orders/', {'date': 'nope'}).status_code, 400)
        self.assertEqual(len(self.api.get('/api/admin/orders/', {'q': f'#{self.a.id}'}).data), 1)

    def test_deactivate_signs_out_and_blocks_login(self):
        res = self.api.post(f'/api/admin/users/{self.driver.uid}/active/', {'active': False}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.driver.refresh_from_db()
        self.assertFalse(self.driver.is_active)
        self.assertFalse(self.driver.is_driver_active)
        self.assertEqual(self.create_trip([self.a.id]).status_code, 400)
        self.assertEqual(self.api.post(f'/api/admin/users/{self.admin.uid}/active/', {'active': False}, format='json').status_code, 400)

    def test_link_farmer_to_agent(self):
        agent = make_user('agent')
        res = self.api.post(f'/api/admin/farmers/{self.farmer.uid}/agent/', {'agent': str(agent.uid)}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        names = [f['full_name'] for f in client_for(agent).get('/api/agent/farmers/').data]
        self.assertIn(self.farmer.full_name, names)
        bad = self.api.post(f'/api/admin/farmers/{self.farmer.uid}/agent/', {'agent': str(self.buyer.uid)}, format='json')
        self.assertEqual(bad.status_code, 400)

    def test_user_search(self):
        res = self.api.get('/api/admin/users/', {'q': self.farmer.full_name})
        self.assertEqual([u['uid'] for u in res.data], [str(self.farmer.uid)])


class PermissionTests(AdminOpsBase):
    def test_non_admins_get_403(self):
        urls = [
            ('get', '/api/admin/overview/'), ('get', '/api/admin/trips/'), ('post', '/api/admin/trips/'),
            ('get', '/api/admin/payouts/'), ('get', '/api/admin/refunds/'),
            ('post', f'/api/admin/orders/{self.a.id}/step/'), ('post', f'/api/admin/payouts/{self.a.id}/record/'),
            ('post', f'/api/admin/users/{self.buyer.uid}/active/'),
            ('post', f'/api/admin/farmers/{self.farmer.uid}/agent/'),
        ]
        for user in (self.buyer, self.farmer, self.driver, make_user('agent')):
            api = client_for(user)
            for method, url in urls:
                self.assertEqual(getattr(api, method)(url, {}, format='json').status_code, 403, (user.role, url))
        for method, url in urls:
            self.assertIn(getattr(client_for(), method)(url, {}, format='json').status_code, (401, 403), url)
