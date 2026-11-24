"""
The browser's live connection (wss://<backend>/ws/?ticket=…). One per signed-in tab.
The ticket comes from POST /api/realtime/ticket/ (through the website's proxy, so the login
token itself never reaches browser JavaScript). Events are forwarded as JSON.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core import signing
from django.core.cache import cache

from . import realtime
from .models import User

TICKET_SALT = 'vuna.ws-ticket'
TICKET_SECONDS = 60


def make_ticket(user: User) -> str:
    return signing.dumps({'u': str(user.pk)}, salt=TICKET_SALT)


def user_for_ticket(ticket: str) -> User | None:
    """The user a ticket was issued to, if it is fresh and unused (each ticket works once)."""
    try:
        data = signing.loads(ticket, salt=TICKET_SALT, max_age=TICKET_SECONDS)
    except signing.BadSignature:
        return None
    if not cache.add(f'ws-ticket-used:{ticket[-24:]}', 1, TICKET_SECONDS + 5):
        return None
    return User.objects.filter(pk=data.get('u'), is_active=True).first()


class LiveConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        query = parse_qs(self.scope.get('query_string', b'').decode())
        ticket = (query.get('ticket') or [''])[0]
        user = await database_sync_to_async(user_for_ticket)(ticket) if ticket else None
        if user is None:
            await self.close(code=4401)
            return
        self.groups_joined = [realtime.user_group(user.pk)]
        if user.role == 'admin':
            self.groups_joined.append(realtime.ADMINS)
        for group in self.groups_joined:
            await self.channel_layer.group_add(group, self.channel_name)
        await self.accept()
        await self.send_json({'type': 'hello'})

    async def disconnect(self, code):
        for group in getattr(self, 'groups_joined', []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get('type') == 'ping':
            await self.send_json({'type': 'pong'})

    async def forward(self, message):
        await self.send_json(message['event'])
