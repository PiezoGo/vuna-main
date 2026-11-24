from datetime import timedelta
from unittest import mock

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from asgiref.testing import ApplicationCommunicator
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone

from api.consumers import make_ticket
from api.models import Notification, Order

from .factories import client_for, make_product, make_user
from .test_admin_ops import TOMORROW, make_line


class SummaryTests(TestCase):
    def setUp(self):
        self.admin = make_user('admin')
        self.buyer = make_user('buyer')
        self.farmer = make_user('farmer')
        self.driver = make_user('driver')

    def summary(self, user):
        return client_for(user).get('/api/notifications/summary/').data

    def test_farmer_waiting_orders_and_urgency(self):
        line = make_line(self.buyer, self.farmer, status='pending', is_paid=False)
        badge = self.summary(self.farmer)['badges']['/farmer/orders']
        self.assertEqual(badge, {'count': 1, 'urgent': False})
        Order.objects.filter(pk=line.pk).update(created_at=timezone.now() - timedelta(minutes=100))
        self.assertTrue(self.summary(self.farmer)['badges']['/farmer/orders']['urgent'])

    def test_admin_queues(self):
        make_line(self.buyer, self.farmer)  # paid, no trip
        badges = self.summary(self.admin)['badges']
        self.assertEqual(badges['/admin/trips']['count'], 1)
        self.assertNotIn('/admin/payouts', badges)  # zero counts are left out

    def test_driver_and_buyer(self):
        line = make_line(self.buyer, self.farmer)
        client_for(self.admin).post('/api/admin/trips/', {
            'delivery_date': TOMORROW.isoformat(), 'driver': str(self.driver.uid), 'orders': [line.id]}, format='json')
        self.assertEqual(self.summary(self.driver)['badges']['/driver']['count'], 1)
        Order.objects.filter(pk=line.pk).update(status='delivered')
        self.assertEqual(self.summary(self.buyer)['badges']['/orders']['count'], 1)

    def test_requires_sign_in(self):
        self.assertIn(client_for().get('/api/notifications/summary/').status_code, (401, 403))


class BellEventTests(TestCase):
    def setUp(self):
        self.admin = make_user('admin')
        self.buyer = make_user('buyer')
        self.agent = make_user('agent')
        self.farmer = make_user('farmer', agent=self.agent)
        self.driver = make_user('driver')

    def kinds(self, user):
        return list(Notification.objects.filter(user=user).values_list('kind', flat=True))

    def test_order_flow_notifies_the_right_people(self):
        line = make_line(self.buyer, self.farmer, status='pending', is_paid=True)
        client_for(self.farmer).post(f'/api/orders/{line.id}/accept/')
        self.assertIn('order_accepted', self.kinds(self.buyer))
        client_for(self.admin).post('/api/admin/trips/', {
            'delivery_date': TOMORROW.isoformat(), 'driver': str(self.driver.uid), 'orders': [line.id]}, format='json')
        self.assertEqual(self.kinds(self.driver), ['trip_new'])
        driver_note = Notification.objects.get(user=self.buyer, kind='driver_assigned')
        self.assertIn(self.driver.full_name, driver_note.title)
        client_for(self.admin).post(f'/api/admin/orders/{line.id}/step/', {'status': 'collected'}, format='json')
        client_for(self.admin).post(f'/api/admin/orders/{line.id}/step/', {'status': 'delivered'}, format='json')
        self.assertIn('collected', self.kinds(self.farmer))
        self.assertIn('delivered', self.kinds(self.buyer))
        client_for(self.admin).post(f'/api/admin/payouts/{line.id}/record/', {'reference': 'SKA1B2C3D4'})
        payout = Notification.objects.get(user=self.farmer, kind='payout')
        self.assertIn('920.00', payout.title)
        self.assertEqual(self.kinds(self.agent), [])  # agents only hear about new orders
        self.assertEqual(Notification.objects.filter(user=self.admin).count(), 0)  # no bell item per paid order

    def test_new_checkout_notifies_farmer_and_agent(self):
        from api.models import DeliveryAddress
        product = make_product(self.farmer)
        address = DeliveryAddress.objects.create(buyer=self.buyer, label='Main', contact_name='Chef',
                                                 contact_phone='254700000001', area='Westlands', details='Gate 2')
        res = client_for(self.buyer).post('/api/checkouts/', {
            'items': [{'product': product.id, 'quantity': 2}], 'address': address.id,
            'delivery_date': TOMORROW.isoformat(), 'payment_choice': 'pay_after'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(self.kinds(self.farmer), ['order_new'])
        self.assertEqual(self.kinds(self.agent), ['order_new'])

    def test_farmer_signup_tells_admins(self):
        client_for().post('/api/register/', {
            'email': 'new@test.vuna', 'password': 'Harvest-2026!', 'full_name': 'Wanjiku Kamau',
            'role': 'farmer', 'phone_number': '0712 345 678', 'city': 'Limuru'})
        self.assertEqual(self.kinds(self.admin), ['farmer_signup'])

    def test_live_push_happens_after_commit(self):
        from api.notifications import notify
        with mock.patch('api.realtime._send') as send:
            with self.captureOnCommitCallbacks(execute=False) as callbacks:
                notify(self.buyer, 'x', 'Hello')
                send.assert_not_called()
            for callback in callbacks:
                callback()
            groups = [c.args[0] for c in send.call_args_list]
            self.assertIn(f'user.{self.buyer.pk}', groups)

    def test_list_and_mark_read_are_private(self):
        make_line(self.buyer, self.farmer, status='pending', is_paid=True)
        Notification.objects.create(user=self.buyer, kind='x', title='Hello')
        api = client_for(self.buyer)
        items = api.get('/api/notifications/').data
        self.assertEqual([i['title'] for i in items], ['Hello'])
        other = Notification.objects.create(user=self.farmer, kind='x', title='Not yours')
        api.post('/api/notifications/read/', {'ids': [other.id]}, format='json')
        other.refresh_from_db()
        self.assertIsNone(other.read_at)
        res = api.post('/api/notifications/read/', {}, format='json')
        self.assertEqual(res.data['unread'], 0)


class Socket(ApplicationCommunicator):
    """A minimal websocket test client (channels.testing needs daphne, which we don't install)."""

    def __init__(self, app, query, origin):
        super().__init__(app, {
            'type': 'websocket', 'path': '/ws/', 'query_string': query.encode(),
            'headers': [(b'origin', origin)], 'subprotocols': [],
        })

    async def connect(self):
        await self.send_input({'type': 'websocket.connect'})
        reply = await self.receive_output(5)
        return reply['type'] == 'websocket.accept', reply

    async def receive_json_from(self):
        import json
        reply = await self.receive_output(5)
        return json.loads(reply['text'])

    async def disconnect(self):
        await self.send_input({'type': 'websocket.disconnect', 'code': 1000})
        await self.wait(1)


@override_settings(CHANNEL_LAYERS={'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}})
class LiveConnectionTests(TransactionTestCase):
    def connect(self, query, origin=b'http://localhost:3000'):
        from backend.asgi import application
        return Socket(application, query, origin)

    def test_ticket_connects_once_and_receives_own_events(self):
        user = make_user('buyer')
        res = client_for(user).post('/api/realtime/ticket/')
        ticket = res.data['ticket']

        async def scenario():
            comm = self.connect(f'ticket={ticket}')
            connected, _ = await comm.connect()
            assert connected
            assert (await comm.receive_json_from())['type'] == 'hello'
            layer = get_channel_layer()
            await layer.group_send(f'user.{user.pk}', {'type': 'forward', 'event': {'type': 'badges'}})
            assert (await comm.receive_json_from()) == {'type': 'badges'}
            await comm.disconnect()
            again = self.connect(f'ticket={ticket}')  # tickets work once
            ok, _ = await again.connect()
            assert not ok

        async_to_sync(scenario)()

    def test_rejects_bad_ticket_and_foreign_origin(self):
        user = make_user('farmer')

        async def scenario():
            bad, _ = await self.connect('ticket=nonsense').connect()
            assert not bad
            foreign, _ = await self.connect(f'ticket={make_ticket(user)}', origin=b'https://evil.example').connect()
            assert not foreign

        async_to_sync(scenario)()
