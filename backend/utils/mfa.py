"""
MFA (Multi-Factor Authentication) utilities
"""
import pyotp
import qrcode
import secrets
import base64
from io import BytesIO


def generate_mfa_secret() -> str:
    """Generate a new MFA secret"""
    return pyotp.random_base32()


def generate_backup_codes(count: int = 8) -> list:
    """Generate backup codes for MFA recovery"""
    return [secrets.token_hex(4).upper() for _ in range(count)]


def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_qr_code(secret: str, email: str) -> str:
    """Generate QR code for authenticator app"""
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=email, issuer_name="CREATIVINDUSTRY France")
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()
