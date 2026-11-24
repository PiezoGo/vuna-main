from decimal import Decimal
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from api.models import Order, Problem

from .factories import client_for, make_user
from .test_admin_ops import TOMORROW, make_line


def photo(name='p.jpg'):
    return SimpleUploadedFile(name, b'\xff\xd8\xff' + b'0' * 100, content_type='image/jpeg')


class DeliveryBase(TestCase):
    def setUp(self):
        self.admin = make_user('admin')
        self.buyer = make_user('buyer')
        self.farmer = make_user('farmer')
        self.driver = make_user('driver')
        self.line = make_line(self.buyer, self.farmer)
        res = client_for(self.admin).post('/api/admin/trips/', {
            'delivery_date': TOMORROW.isoformat(), 'driver': str(self.driver.uid), 'orders': [self.line.id],
        }, format='json')
        self.trip_id = res.data['id']
        self.drv = client_for(self.driver)
        self.buy = client_for(self.buyer)
        self.adm = client_for(self.admin)

    @staticmethod
    def storage(storage):
        storage.save.side_effect = lambda name, f: name
        storage.url.side_effect = lambda name: f'https://res.cloudinary.com/demo/image/upload/{name}'

    def collect(self, client=None, **extra):
        data = {'photo': photo(), 'condition': 'good', **extra}
        return (client or self.drv).post(f'/api/driver/orders/{self.line.id}/collect/', data, format='multipart')

    def deliver(self):
        return self.drv.post(f'/api/driver/orders/{self.line.id}/deliver/', {'photo': photo()}, format='multipart')


@mock.patch('api.delivery.default_storage')
class DriverTests(DeliveryBase):
    def test_driver_sees_own_trip_with_contacts(self, storage):
        trips = self.drv.get('/api/driver/trips/').data
        self.assertEqual([t['id'] for t in trips], [self.trip_id])
        stop = trips[0]['stops'][0]
        self.assertEqual(stop['contact_phone'], '254700000001')
        self.assertEqual(stop['area'], 'Westlands')
        self.assertEqual(client_for(make_user('driver')).get('/api/driver/trips/').data, [])

    def test_collect_then_deliver_with_photos(self, storage):
        self.storage(storage)
        self.assertEqual(self.deliver().status_code, 400)  # must collect first
        res = self.collect(note='Crates sealed')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data['pickup_photo'].startswith('https://res.cloudinary.com/'))
        self.assertEqual(self.adm.get('/api/admin/payouts/').data[0]['id'], self.line.id)  # 4-hour clock started
        res = self.deliver()
        self.assertEqual(res.status_code, 200, res.data)
        self.line.refresh_from_db()
        self.assertEqual(self.line.status, 'delivered')
        self.assertTrue(self.line.delivery_photo)

    def test_photo_required_and_other_driver_blocked(self, storage):
        self.storage(storage)
        doc = SimpleUploadedFile('x.pdf', b'%PDF', content_type='application/pdf')
        self.assertEqual(self.collect(photo=doc).status_code, 400)
        res = self.drv.post(f'/api/driver/orders/{self.line.id}/collect/', {'condition': 'good'}, format='multipart')
        self.assertEqual(res.status_code, 400)
        self.assertIn('photo', res.data)
        self.assertEqual(self.collect(client=client_for(make_user('driver'))).status_code, 403)
        for role in ('buyer', 'farmer', 'admin'):
            self.assertEqual(self.collect(client=client_for(make_user(role))).status_code, 403, role)


@mock.patch('api.delivery.default_storage')
class ConfirmAndProblemTests(DeliveryBase):
    def setUp(self):
        super().setUp()
        with mock.patch('api.delivery.default_storage') as storage:
            self.storage(storage)
            self.collect()
            self.deliver()

    def report(self, storage):
        self.storage(storage)
        return self.buy.post(f'/api/orders/{self.line.id}/problems/', {
            'reason': 'quality', 'description': 'Half the tomatoes were soft', 'photo': photo(),
        }, format='multipart')

    def test_no_auto_complete_buyer_confirms(self, storage):
        waiting = self.buy.get('/api/orders/awaiting-confirmation/').data
        self.assertEqual([o['id'] for o in waiting], [self.line.id])
        self.assertEqual(client_for(make_user('buyer')).post(f'/api/orders/{self.line.id}/confirm/').status_code, 404)
        res = self.buy.post(f'/api/orders/{self.line.id}/confirm/')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['status'], 'completed')
        self.assertEqual(self.buy.get('/api/orders/awaiting-confirmation/').data, [])

    def test_problem_blocks_confirm_and_holds_payout(self, storage):
        self.assertEqual(self.report(storage).status_code, 201)
        self.assertEqual(self.report(storage).status_code, 400)  # one open problem per line
        self.assertEqual(self.buy.post(f'/api/orders/{self.line.id}/confirm/').status_code, 400)
        self.assertTrue(self.adm.get('/api/admin/payouts/').data[0]['on_hold'])
        self.assertEqual(self.adm.get('/api/admin/overview/').data['problems_open'], 1)

    def test_partial_farmer_fault_refund_deducts_next_payout(self, storage):
        self.report(storage)
        # Farmer already paid out for this line.
        self.adm.post(f'/api/admin/payouts/{self.line.id}/record/', {'reference': 'SKA1B2C3D4'})
        problem = Problem.objects.get()
        url = f'/api/admin/problems/{problem.id}/decide/'
        self.assertEqual(self.adm.post(url, {'decision': 'refund', 'note': 'x'}, format='json').status_code, 400)  # fault needed
        self.assertEqual(self.adm.post(url, {'decision': 'refund', 'fault': 'farmer', 'amount': '5000', 'note': 'x'}, format='json').status_code, 400)
        res = self.adm.post(url, {'decision': 'refund', 'fault': 'farmer', 'amount': '600.00', 'note': 'Half soft'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(Decimal(res.data['farmer_deduction']), Decimal('460.00'))  # 600 × 920/1200
        self.line.refresh_from_db()
        self.assertEqual(self.line.status, 'completed')
        refunds = self.adm.get('/api/admin/refunds/').data
        self.assertEqual([(r['id'], Decimal(r['amount'])) for r in refunds], [(self.line.id, Decimal('600.00'))])
        # The farmer's next collected line carries the deduction.
        nxt = make_line(self.buyer, self.farmer)
        Order.objects.filter(pk=nxt.pk).update(status='collected', collected_at=self.line.collected_at)
        row = next(r for r in self.adm.get('/api/admin/payouts/').data if r['id'] == nxt.id)
        self.assertEqual((Decimal(row['deduction']), Decimal(row['amount_to_send'])), (Decimal('460.00'), Decimal('460.00')))
        self.adm.post(f'/api/admin/payouts/{nxt.id}/record/', {'reference': 'SKA1B2C3D5'})
        nxt.refresh_from_db()
        self.assertEqual(nxt.payout_deduction, Decimal('460.00'))
        problem.refresh_from_db()
        self.assertEqual(problem.deducted_on_id, nxt.id)

    def test_vuna_fault_and_reject_do_not_touch_farmer(self, storage):
        self.report(storage)
        problem = Problem.objects.get()
        res = self.adm.post(f'/api/admin/problems/{problem.id}/decide/',
                            {'decision': 'refund', 'fault': 'vuna', 'note': 'Driver dropped a crate'}, format='json')
        self.assertEqual(Decimal(res.data['farmer_deduction']), Decimal('0'))
        self.assertEqual(Decimal(res.data['refund_amount']), Decimal('1200.00'))
        row = self.adm.get('/api/admin/payouts/').data[0]
        self.assertEqual(Decimal(row['amount_to_send']), Decimal('920.00'))

    def test_problems_queue_admin_only(self, storage):
        self.report(storage)
        self.assertEqual(len(self.adm.get('/api/admin/problems/').data), 1)
        for user in (self.buyer, self.farmer, self.driver):
            self.assertEqual(client_for(user).get('/api/admin/problems/').status_code, 403)


@mock.patch('api.delivery.default_storage')
class ChatTests(DeliveryBase):
    def test_driver_and_buyer_only(self, storage):
        url = f'/api/orders/{self.line.id}/messages/'
        self.assertEqual(self.drv.post(url, {'message': 'At the gate'}, format='json').status_code, 201)
        self.assertEqual(self.buy.post(url, {'message': 'Coming down'}, format='json').status_code, 201)
        msgs = self.buy.get(url).data
        self.assertEqual([m['sender_role'] for m in msgs], ['driver', 'buyer'])
        for user in (self.farmer, make_user('driver'), make_user('buyer')):
            self.assertEqual(client_for(user).get(url).status_code, 403)

    def test_closed_after_completion(self, storage):
        Order.objects.filter(pk=self.line.pk).update(status='completed')
        res = self.drv.post(f'/api/orders/{self.line.id}/messages/', {'message': 'hi'}, format='json')
        self.assertEqual(res.status_code, 400)
