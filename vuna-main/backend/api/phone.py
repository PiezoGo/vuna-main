"""Kenyan phone numbers in the one format M-Pesa (Daraja) accepts: 2547XXXXXXXX or 2541XXXXXXXX."""
import re

_KE_MOBILE = re.compile(r'^(?:\+?254|0)?([71]\d{8})$')


def normalize_ke_phone(raw: str) -> str | None:
    """'0712 345 678', '+254712345678', '712345678' → '254712345678'. Returns None if invalid."""
    if not raw:
        return None
    digits = re.sub(r'[\s\-().]', '', str(raw))
    match = _KE_MOBILE.match(digits)
    return f'254{match.group(1)}' if match else None
