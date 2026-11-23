from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone

from api.models import DeliveryAddress, Order, Product

from .factories import client_for, make_product, make_user


class ListingManagementTests(TestCase):
    def setUp(self):
        self.farmer = make_user('farmer')
        self.product = make_product(self.farmer, base='100.00', quantity=20)
        self.api = client_for(self.farmer)

    def test_remove_archives_and_keeps_orders(self):
        buyer = make_user('buyer')
        Order.objects.create(product=self.product, buyer=buyer, farmer=self.farmer, quantity=1, total_price='120.00')
        self.assertEqual(self.api.delete(f'/api/products/{self.product.id}/').status_code, 204)
        self.product.refresh_from_db()
        self.assertTrue(self.product.archived)
        self.assertFalse(self.product.is_active)
        self.assertEqual(Order.objects.filter(product=self.product).count(), 1)
        self.assertEqual(self.api.get('/api/products/', {'my_listings': 'true'}).data, [])
        self.assertEqual(len(self.api.get('/api/products/', {'my_listings': 'true', 'status': 'all'}).data), 1)

    def test_pause_hides_from_market_and_show_again(self):
        self.api.patch(f'/api/products/{self.product.id}/', {'is_active': False})
        self.assertEqual(client_for().get('/api/products/').data['count'], 0)
        self.api.patch(f'/api/products/{self.product.id}/', {'is_active': True})
        self.assertEqual(client_for().get('/api/products/').data['count'], 1)

    def test_farmer_sees_own_price_and_share_buyers_do_not(self):
        mine = self.api.get(f'/api/products/{self.product.id}/').data
        self.assertEqual(Decimal(mine['base_price_per_unit']), Decimal('100.00'))
        self.assertEqual(Decimal(mine['farmer_earnings_per_unit']), Decimal('92.00'))
        public = client_for(make_user('buyer')).get(f'/api/products/{self.product.id}/').data
        self.assertIsNone(public['base_price_per_unit'])
        self.assertIsNone(public['farmer_earnings_per_unit'])
        self.assertEqual(Decimal(public['listed_price_per_unit']), Decimal('120.00'))

    @mock.patch('api.views.default_storage')
    def test_photo_slots_replace_and_remove(self, storage):
        storage.save.side_effect = lambda name, f: name
        storage.url.side_effect = lambda name: f'https://res.cloudinary.com/demo/image/upload/{name}'
        Product.objects.filter(pk=self.product.pk).update(images=['https://x/a.jpg', 'https://x/b.jpg'])
        photo = SimpleUploadedFile('c.jpg', b'\xff\xd8\xff' + b'0' * 100, content_type='image/jpeg')
        res = self.api.patch(f'/api/products/{self.product.id}/', {'remove_images': '0', 'image3': photo}, format='multipart')
        self.assertEqual(res.status_code, 200, res.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.images[0], 'https://x/b.jpg')
        self.assertTrue(self.product.images[1].endswith('image3_c.jpg'))

    def test_rejects_non_images(self):
        doc = SimpleUploadedFile('x.pdf', b'%PDF', content_type='application/pdf')
        res = self.api.patch(f'/api/products/{self.product.id}/', {'image1': doc}, format='multipart')
        self.assertEqual(res.status_code, 400)


class AgentTests(TestCase):
    def setUp(self):
        self.agent = make_user('agent')
        self.linked = make_user('farmer', agent=self.agent)
        self.other = make_user('farmer')
        self.api = client_for(self.agent)
        self.payload = {'title': 'Cabbage', 'unit': 'piece', 'base_price_per_unit': '40', 'quantity': 30}

    def test_agent_lists_and_manages_only_linked_farmers(self):
        farmers = self.api.get('/api/agent/farmers/').data
        self.assertEqual([f['uid'] for f in farmers], [str(self.linked.uid)])

        res = self.api.post('/api/products/', {**self.payload, 'farmer': str(self.linked.uid)})
        self.assertEqual(res.status_code, 201, res.data)
        product = Product.objects.get(pk=res.data['id'])
        self.assertEqual(product.farmer, self.linked)
        self.assertEqual(product.created_by, self.agent)

        self.assertEqual(self.api.post('/api/products/', {**self.payload, 'farmer': str(self.other.uid)}).status_code, 400)
        theirs = make_product(self.other)
        self.assertEqual(self.api.patch(f'/api/products/{theirs.id}/', {'title': 'x'}).status_code, 403)
        self.assertEqual(self.api.patch(f'/api/products/{product.id}/', {'quantity': 50}).status_code, 200)
        listed = self.api.get('/api/products/', {'my_listings': 'true', 'farmer': str(self.linked.uid)}).data
        self.assertEqual(len(listed), 1)

    def test_others_cannot_use_agent_endpoints(self):
        self.assertEqual(client_for(self.linked).get('/api/agent/farmers/').status_code, 403)


class FarmerSummaryTests(TestCase):
    def test_summary_counts_and_money(self):
        farmer = make_user('farmer')
        buyer = make_user('buyer')
        product = make_product(farmer, base='100.00', quantity=10)
        make_product(farmer, is_active=False)
        address = DeliveryAddress.objects.create(buyer=buyer, label='K', contact_name='C', contact_phone='254711000222', area='A', details='D')
        checkout = client_for(buyer).post('/api/checkouts/', {
            'items': [{'product': product.id, 'quantity': 2}], 'address': address.id,
            'delivery_date': (timezone.localdate() + timedelta(days=1)).isoformat(), 'payment_choice': 'pay_now',
        }, format='json').data
        client_for(buyer).post(f"/api/checkouts/{checkout['id']}/pay/")
        res = client_for(farmer).get('/api/farmer/summary/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['live_listings'], 1)
        self.assertEqual(res.data['paused_listings'], 1)
        self.assertEqual(res.data['waiting_orders'], 1)
        self.assertEqual(Decimal(res.data['earnings_due']), Decimal('184.00'))  # 92% of 2 x 100
        self.assertEqual(Decimal(res.data['paid_out']), Decimal('0'))
        self.assertEqual(client_for(buyer).get('/api/farmer/summary/').status_code, 403)
