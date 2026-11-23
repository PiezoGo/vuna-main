"""
Safaricom Daraja client for M-Pesa Express (STK Push).

Configured by environment variables (see .env.example). With MPESA_ENV unset the app runs in
"simulated" mode: no request leaves the server and payments succeed immediately, which is what
local development and the test suite use.
"""
import base64
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from django.core.cache import cache

log = logging.getLogger(__name__)

BASE_URLS = {
    'sandbox': 'https://sandbox.safaricom.co.ke',
    'production': 'https://api.safaricom.co.ke',
}
TIMEOUT = 20  # seconds
NAIROBI = ZoneInfo('Africa/Nairobi')

# Daraja result codes the buyer may see.
RESULT_MESSAGES = {
    0: 'Payment received.',
    1: 'Not enough money in the M-Pesa account.',
    1032: 'The payment request was cancelled on the phone.',
    1037: "The phone couldn't be reached. Make sure it's on and try again.",
    2001: 'The M-Pesa PIN was wrong.',
}


class MpesaError(Exception):
    """Daraja refused the request or could not be reached."""


@dataclass(frozen=True)
class MpesaConfig:
    env: str
    consumer_key: str
    consumer_secret: str
    shortcode: str
    passkey: str
    callback_base: str
    callback_token: str

    @property
    def base_url(self) -> str:
        return BASE_URLS[self.env]


def config() -> MpesaConfig | None:
    """The live Daraja configuration, or None in simulated mode."""
    env = os.environ.get('MPESA_ENV', '').strip().lower()
    if env not in BASE_URLS:
        return None
    values = {
        name: os.environ.get(f'MPESA_{name.upper()}', '').strip()
        for name in ('consumer_key', 'consumer_secret', 'shortcode', 'passkey', 'callback_token')
    }
    callback_base = (os.environ.get('MPESA_CALLBACK_BASE') or os.environ.get('RENDER_EXTERNAL_URL') or '').rstrip('/')
    missing = [k for k, v in values.items() if not v] + ([] if callback_base else ['callback_base'])
    if missing:
        raise MpesaError(f"M-Pesa is switched on but these settings are missing: {', '.join(missing)}.")
    return MpesaConfig(env=env, callback_base=callback_base, **values)


def is_simulated() -> bool:
    return os.environ.get('MPESA_ENV', '').strip().lower() not in BASE_URLS


def _timestamp() -> str:
    return datetime.now(NAIROBI).strftime('%Y%m%d%H%M%S')


def _password(cfg: MpesaConfig, timestamp: str) -> str:
    return base64.b64encode(f'{cfg.shortcode}{cfg.passkey}{timestamp}'.encode()).decode()


def _token(cfg: MpesaConfig) -> str:
    key = f'mpesa-token-{cfg.env}-{cfg.consumer_key[:6]}'
    token = cache.get(key)
    if token:
        return token
    try:
        res = requests.get(
            f'{cfg.base_url}/oauth/v1/generate',
            params={'grant_type': 'client_credentials'},
            auth=(cfg.consumer_key, cfg.consumer_secret),
            timeout=TIMEOUT,
        )
        res.raise_for_status()
        data = res.json()
    except (requests.RequestException, ValueError) as exc:
        log.error('M-Pesa token request failed: %s', exc)
        raise MpesaError("Couldn't connect to M-Pesa. Please try again.") from exc
    token = data['access_token']
    cache.set(key, token, max(60, int(data.get('expires_in', 3599)) - 60))
    return token


def _post(cfg: MpesaConfig, path: str, payload: dict) -> dict:
    try:
        res = requests.post(
            f'{cfg.base_url}{path}',
            json=payload,
            headers={'Authorization': f'Bearer {_token(cfg)}'},
            timeout=TIMEOUT,
        )
        data = res.json()
    except (requests.RequestException, ValueError) as exc:
        log.error('M-Pesa request %s failed: %s', path, exc)
        raise MpesaError("Couldn't connect to M-Pesa. Please try again.") from exc
    if res.status_code >= 400 and 'ResultCode' not in data:
        log.error('M-Pesa %s refused (%s): %s', path, res.status_code, data)
        raise MpesaError(data.get('errorMessage') or 'M-Pesa refused the request.')
    return data


def callback_url(cfg: MpesaConfig) -> str:
    return f'{cfg.callback_base}/api/payments/mpesa/callback/{cfg.callback_token}/'


def stk_push(*, phone: str, amount: int, reference: str, description: str) -> dict:
    """Send the payment prompt. Returns Daraja's response (MerchantRequestID, CheckoutRequestID…)."""
    cfg = config()
    if cfg is None:
        raise MpesaError('M-Pesa is in simulated mode.')
    timestamp = _timestamp()
    data = _post(cfg, '/mpesa/stkpush/v1/processrequest', {
        'BusinessShortCode': cfg.shortcode,
        'Password': _password(cfg, timestamp),
        'Timestamp': timestamp,
        'TransactionType': 'CustomerPayBillOnline',
        'Amount': amount,
        'PartyA': phone,
        'PartyB': cfg.shortcode,
        'PhoneNumber': phone,
        'CallBackURL': callback_url(cfg),
        'AccountReference': reference[:12],
        'TransactionDesc': description[:13],
    })
    if str(data.get('ResponseCode')) != '0':
        raise MpesaError(data.get('errorMessage') or data.get('ResponseDescription') or 'M-Pesa refused the request.')
    return data


def stk_query(checkout_request_id: str) -> dict:
    """Ask Daraja what happened to a prompt (used when no callback arrived)."""
    cfg = config()
    if cfg is None:
        raise MpesaError('M-Pesa is in simulated mode.')
    timestamp = _timestamp()
    return _post(cfg, '/mpesa/stkpushquery/v1/query', {
        'BusinessShortCode': cfg.shortcode,
        'Password': _password(cfg, timestamp),
        'Timestamp': timestamp,
        'CheckoutRequestID': checkout_request_id,
    })


def result_message(code: int | None, fallback: str = '') -> str:
    if code is None:
        return fallback or 'Waiting for M-Pesa.'
    return RESULT_MESSAGES.get(code, fallback or 'The payment did not go through.')
