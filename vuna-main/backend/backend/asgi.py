"""
ASGI entry point: normal HTTP goes to Django, /ws/ to the live connection (Module 10).
Run with: uvicorn backend.asgi:application --host 0.0.0.0 --port $PORT  (ONE process: the
channel layer is in-memory). Under gunicorn/WSGI the site still works, just without /ws/.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django_app = get_asgi_application()  # set up Django before importing anything that uses models

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import OriginValidator  # noqa: E402
from django.conf import settings  # noqa: E402
from django.urls import path  # noqa: E402

from api.consumers import LiveConsumer  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_app,
    'websocket': OriginValidator(
        URLRouter([path('ws/', LiveConsumer.as_asgi())]),
        settings.WS_ALLOWED_ORIGINS,
    ),
})
