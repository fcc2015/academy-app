"""
TOTP (Time-based One-Time Password) service for 2FA.
Uses pyotp — compatible with Google Authenticator, Authy, and any RFC 6238 app.
"""
import pyotp
import qrcode
import io
import base64

APP_NAME = "Football Academy"


def generate_totp_secret() -> str:
    """Generate a cryptographically secure base32 TOTP secret."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    """Return the otpauth:// URI for QR code generation."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=APP_NAME)


def verify_totp_code(secret: str, code: str) -> bool:
    """
    Verify a 6-digit TOTP code.
    valid_window=1 allows ±30s drift (one period before/after current).
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=1)


def generate_qr_base64(uri: str) -> str:
    """Generate a QR code PNG and return it as a base64 data URI."""
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
