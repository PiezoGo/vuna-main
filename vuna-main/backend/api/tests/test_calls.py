import base64
import hashlib
import hmac
import json
import os
from datetime import timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone

from api import calls
from api.models import Call, ChatMessage, Notification

from .factories import client_for, make_user
from .test_admin_ops import TOMORROW, make_line

LIVEKIT = {'LIVEKIT_URL': 'wss://vuna-test.livekit.cloud', 'LIVEKIT_API_KEY': 'APIkey123', 'LIVEKIT_API_SECRET': 's3cret-value'}


def decode(token):
    head, body, sig = token.split('.')
    pad = lambda s: s + '=' * (-len(s) % 4)  # noqa: E731
    expected = hmac.new(LIVEKIT['LIVEKIT_API_SECRET'].encode(), f'{head}.{body}'.encode(), hashlib.sha256).digest()
    assert base64.urlsafe_b64decode(pad(sig)) == expected, 'bad signature'
    return json.loads(base64.urlsafe_b64decode(pad(body)))


@mock.patch.dict(os.environ, LIVEKIT)
class CallTests(TestCase):
    def setUp(self):
        self.buyer = make_user('buyer')
        self.farmer = make_user('farmer')
        self.stranger = make_user('farmer')
        self.driver = make_user('driver')
        self.admin = make_user('admin')
        self.line = make_line(self.buyer, self.farmer)

    def start(self, caller, callee, kind='audio', **extra):
        return client_for(caller).post('/api/calls/', {'callee': str(callee.uid), 'kind': kind, **extra}, format='json')

    def test_who_may_call_whom(self):
        self.assertTrue(calls.can_call(self.buyer, self.farmer))  # they share an order
        self.assertFalse(calls.can_call(self.buyer, self.stranger))  # no order yet: chat only
        self.assertFalse(calls.can_call(self.farmer, self.stranger))
        self.assertFalse(calls.can_call(self.driver, self.buyer))  # not on a trip together
        client_for(self.admin).post('/api/admin/trips/', {
            'delivery_date': TOMORROW.isoformat(), 'driver': str(self.driver.uid), 'orders': [self.line.id]}, format='json')
        self.assertTrue(calls.can_call(self.driver, self.buyer))
        self.assertTrue(calls.can_call(self.driver, self.farmer))  # pickups too
        self.assertTrue(calls.can_call(self.admin, self.stranger))
        self.assertEqual(self.start(self.buyer, self.stranger).status_code, 403)

    def test_token_is_for_this_person_and_room_only(self):
        res = self.start(self.buyer, self.farmer, order=self.line.id)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['url'], LIVEKIT['LIVEKIT_URL'])
        claims = decode(res.data['token'])
        call = Call.objects.get()
        self.assertEqual(claims['sub'], str(self.buyer.uid))
        self.assertEqual(claims['iss'], 'APIkey123')
        self.assertEqual(claims['video'], {'room': call.room, 'roomJoin': True, 'canPublish': True, 'canSubscribe': True})
        self.assertLessEqual(claims['exp'] - claims['nbf'], calls.TOKEN_SECONDS + 10)
        self.assertEqual(call.order_id, self.line.id)
        self.assertNotIn('s3cret', json.dumps(res.data))

    def test_answer_and_end_writes_a_chat_line(self):
        call_id = self.start(self.buyer, self.farmer).data['call']['id']
        self.assertEqual(client_for(self.buyer).post(f'/api/calls/{call_id}/accept/').status_code, 403)  # caller can't answer
        self.assertEqual(client_for(self.stranger).post(f'/api/calls/{call_id}/hang-up/').status_code, 403)
        res = client_for(self.farmer).post(f'/api/calls/{call_id}/accept/')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(decode(res.data['token'])['sub'], str(self.farmer.uid))
        client_for(self.farmer).post(f'/api/calls/{call_id}/hang-up/')
        self.assertEqual(Call.objects.get().status, 'ended')
        self.assertEqual(ChatMessage.objects.get().message, 'Audio call · 1 min')
        self.assertEqual(client_for(self.buyer).post(f'/api/calls/{call_id}/hang-up/').status_code, 200)  # twice is fine

    def test_decline(self):
        call_id = self.start(self.buyer, self.farmer, kind='video').data['call']['id']
        client_for(self.farmer).post(f'/api/calls/{call_id}/hang-up/')
        self.assertEqual(Call.objects.get().status, 'declined')
        self.assertEqual(client_for(self.farmer).post(f'/api/calls/{call_id}/accept/').status_code, 400)

    def test_caller_hangs_up_or_no_answer_is_missed(self):
        call_id = self.start(self.buyer, self.farmer).data['call']['id']
        client_for(self.buyer).post(f'/api/calls/{call_id}/hang-up/')
        self.assertEqual(Call.objects.get(pk=call_id).status, 'missed')
        note = Notification.objects.get(user=self.farmer, kind='call_missed')
        self.assertEqual(note.link, f'/messages/{self.buyer.uid}')
        self.assertEqual(ChatMessage.objects.get().message, 'Missed audio call')
        # Nobody answers within 30 seconds.
        second = self.start(self.buyer, self.farmer).data['call']['id']
        Call.objects.filter(pk=second).update(created_at=timezone.now() - timedelta(seconds=45))
        self.assertEqual(calls.sweep_stale(), 1)
        self.assertEqual(Call.objects.get(pk=second).status, 'missed')

    def test_check_endpoint_and_disabled_without_settings(self):
        data = client_for(self.buyer).get(f'/api/calls/check/{self.farmer.uid}/').data
        self.assertEqual((data['enabled'], data['allowed'], data['online']), (True, True, False))
        calls.went_online(self.farmer.pk)
        self.assertTrue(client_for(self.buyer).get(f'/api/calls/check/{self.farmer.uid}/').data['online'])
        calls.went_offline(self.farmer.pk)
        with mock.patch.dict(os.environ, {'LIVEKIT_API_SECRET': ''}):
            data = client_for(self.buyer).get(f'/api/calls/check/{self.farmer.uid}/').data
            self.assertEqual((data['enabled'], data['allowed']), (False, False))
            self.assertEqual(self.start(self.buyer, self.farmer).status_code, 400)

    def test_ringing_goes_to_the_callee_only(self):
        with mock.patch('api.realtime._send') as send:
            with self.captureOnCommitCallbacks(execute=True):
                self.start(self.buyer, self.farmer)
        rings = [c.args[0] for c in send.call_args_list if c.args[1].get('type') == 'call']
        self.assertEqual(rings, [f'user.{self.farmer.pk}'])
