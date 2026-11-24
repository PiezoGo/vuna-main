import os
import cloudinary
import dj_database_url
from pathlib import Path
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

# ── Core ──────────────────────────────────────────────────────────────────────
def env_bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(name, default=''):
    return [item.strip() for item in os.environ.get(name, default).split(',') if item.strip()]


def env_origins(name, default=''):
    """Origins like https://example.com. Tolerates trailing slashes and missing https://."""
    origins = []
    for item in env_list(name, default):
        item = item.rstrip('/')
        if '://' not in item:
            item = f'https://{item}'
        origins.append(item)
    return origins


def env_required(name, dev_fallback=None):
    """Secrets must come from the environment. In DEBUG a harmless fallback is allowed."""
    value = os.environ.get(name)
    if value:
        return value
    if DEBUG and dev_fallback is not None:
        return dev_fallback
    raise ImproperlyConfigured(f'Missing required environment variable: {name}')


DEBUG = env_bool('DEBUG', default=False)
SECRET_KEY = env_required('SECRET_KEY', dev_fallback='django-insecure-local-dev-only')

ALLOWED_HOSTS = env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1' if DEBUG else '')
render_host = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if render_host:
    ALLOWED_HOSTS.append(render_host)

# ── Apps ──────────────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',  # staticfiles must come before cloudinary_storage

    # Cloudinary — order matters: cloudinary_storage before cloudinary
    'cloudinary_storage',
    'cloudinary',

    # Third-party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'drf_spectacular',
    'channels',

    # Local apps
    'api',
]

# ── Cloudinary ────────────────────────────────────────────────────────────────
# Credentials come only from the environment (see .env.example). Never commit them.
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': env_required('CLOUDINARY_CLOUD_NAME', dev_fallback=''),
    'API_KEY':    env_required('CLOUDINARY_API_KEY', dev_fallback=''),
    'API_SECRET': env_required('CLOUDINARY_API_SECRET', dev_fallback=''),
}

cloudinary.config(
    cloud_name=CLOUDINARY_STORAGE['CLOUD_NAME'],
    api_key=CLOUDINARY_STORAGE['API_KEY'],
    api_secret=CLOUDINARY_STORAGE['API_SECRET'],
    secure=True,
)

# Use Cloudinary for all user-uploaded media; filesystem for static files
STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Legacy settings for older Django versions or packages that rely on it
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Middleware ────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be first
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'
ASGI_APPLICATION = 'backend.asgi.application'

# ── Real-time (Django Channels, Module 10) ───────────────────────────────────
# In-memory layer: works with ONE server process (uvicorn on Render). No Redis by decision;
# running more than one process would need a shared layer such as channels-redis.
CHANNEL_LAYERS = {'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'}}

# ── Database ──────────────────────────────────────────────────────────────────
# Uses Render's DATABASE_URL env var in production; falls back to SQLite locally
DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

# ── Auth ──────────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'api.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── CORS ──────────────────────────────────────────────────────────────────────
# Browsers on these origins may call the API directly (legacy Vite app, local dev).
# The new Next.js app calls Django server-side, so it does not need CORS.
CORS_ALLOWED_ORIGINS = env_origins(
    'CORS_ALLOWED_ORIGINS',
    'https://vuna-main.vercel.app,http://localhost:5173,http://localhost:3000',
)

# Websites allowed to open the live connection (wss://<backend>/ws/). Set to the Vercel URL.
WS_ALLOWED_ORIGINS = env_origins('WS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
_client_url = os.environ.get('CLIENT_URL', '').strip().rstrip('/')
if _client_url and _client_url not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(_client_url)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

# ── DRF ───────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': ['rest_framework.throttling.ScopedRateThrottle'],
    'DEFAULT_THROTTLE_RATES': {
        'login': os.environ.get('THROTTLE_LOGIN', '10/min'),
        'register': os.environ.get('THROTTLE_REGISTER', '20/hour'),
    },
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'VUNA API',
    'DESCRIPTION': 'B2B farm-produce marketplace API (farmers, buyers, drivers, admins). '
                   'Auth: `Authorization: Token <key>`.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': r'/api/',
    'ENUM_NAME_OVERRIDES': {
        'ProductUnitEnum': 'api.models.Product.UNIT_CHOICES',
        'OrderStatusEnum': 'api.models.Order.STATUS_CHOICES',
        'UserRoleEnum': 'api.models.User.ROLE_CHOICES',
        'ProblemStatusEnum': 'api.models.Problem.STATUS_CHOICES',
        'ProblemReasonEnum': 'api.models.Problem.REASON_CHOICES',
    },
}

# ── Internationalisation ──────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

# ── Production security ──────────────────────────────────────────────────────
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '3600'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    CSRF_TRUSTED_ORIGINS = env_origins('CSRF_TRUSTED_ORIGINS')
    if render_host:
        CSRF_TRUSTED_ORIGINS.append(f'https://{render_host}')

# ── Static & Media ───────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Logging ──────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'loggers': {
        'django': {'handlers': ['console'], 'level': 'INFO'},
        'django.request': {'handlers': ['console'], 'level': 'ERROR', 'propagate': False},
    },
}
