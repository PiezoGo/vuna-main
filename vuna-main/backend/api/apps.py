from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        from . import realtime  # noqa: F401 — registers the live badge signals
