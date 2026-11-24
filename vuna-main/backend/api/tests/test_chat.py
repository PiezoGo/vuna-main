from unittest import mock

from django.test import TestCase

from api.models import ChatMessage

from .factories import client_for, make_user
from .test_admin_ops import TOMORROW, make_line


class ChatRuleTests(TestCase):
    def setUp(self):
        self.buyer = make_user('buyer')
        self.farmer = make_user('farmer')
        self.other_farmer = make_user('farmer')
        self.driver = make_user('driver')
        self.admin = make_user('admin')

    def send(self, sender, receiver, text='Habari'):
        return client_for(sender).post(f'/api/messages/with/{receiver.uid}/', {'message': text}, format='json')

    def test_buyer_and_farmer_talk_and_unread_counts(self):
        self.assertEqual(self.send(self.buyer, self.farmer).status_code, 201)
        self.assertEqual(self.send(self.buyer, self.farmer, 'Do you have 50 kg?').status_code, 201)
        inbox = client_for(self.farmer).get('/api/messages/inbox/').data
        self.assertEqual(len(inbox), 1)
        self.assertEqual(inbox[0]['unread'], 2)
        self.assertEqual(inbox[0]['last_message']['message'], 'Do you have 50 kg?')
        self.assertEqual(client_for(self.farmer).get('/api/notifications/summary/').data['messages'], 2)
        convo = client_for(self.farmer).get(f'/api/messages/with/{self.buyer.uid}/').data
        self.assertTrue(convo['can_send'])
        self.assertEqual(len(convo['messages']), 2)
        self.assertEqual(client_for(self.farmer).get('/api/messages/inbox/').data[0]['unread'], 0)

    def test_who_may_message_whom(self):
        self.assertEqual(self.send(self.farmer, self.other_farmer).status_code, 403)
        self.assertEqual(self.send(self.driver, self.buyer).status_code, 403)  # no trip together
        self.assertEqual(self.send(self.admin, self.driver).status_code, 201)
        self.assertEqual(client_for(self.farmer).get(f'/api/messages/with/{self.other_farmer.uid}/').status_code, 404)
        # The legacy endpoint follows the same rule.
        res = client_for(self.farmer).post('/api/messages/', {'receiver_id': str(self.other_farmer.uid), 'message': 'x'})
        self.assertEqual(res.status_code, 403)

    def test_driver_may_message_buyers_on_own_trip(self):
        line = make_line(self.buyer, self.farmer)
        client_for(self.admin).post('/api/admin/trips/', {
            'delivery_date': TOMORROW.isoformat(), 'driver': str(self.driver.uid), 'orders': [line.id]}, format='json')
        self.assertEqual(self.send(self.driver, self.buyer, 'At the gate').status_code, 201)

    def test_messages_are_pushed_live_to_both_people(self):
        with mock.patch('api.realtime._send') as send:
            with self.captureOnCommitCallbacks(execute=True):
                self.send(self.buyer, self.farmer)
        events = [(c.args[0], c.args[1]['type']) for c in send.call_args_list]
        self.assertIn((f'user.{self.farmer.pk}', 'message'), events)
        self.assertIn((f'user.{self.buyer.pk}', 'message'), events)
        self.assertIn((f'user.{self.farmer.pk}', 'badges'), events)
        self.assertEqual(ChatMessage.objects.count(), 1)
