import base64
import logging
from typing import Optional
from cryptography.fernet import Fernet
from core.config import settings

logger = logging.getLogger("encryption")

# Resolve or generate Fernet key
_fernet: Optional[Fernet] = None
_fallback_used = False

def init_encryption():
    global _fernet, _fallback_used
    key = settings.ENCRYPTION_KEY
    
    if not key:
        if settings.DEV_MODE:
            # Generate a temporary key for local development
            temp_key = Fernet.generate_key()
            _fernet = Fernet(temp_key)
            _fallback_used = True
            logger.warning(
                "⚠️ ENCRYPTION_KEY not set in .env! Generating a transient key for local development. "
                "WARNING: Encrypted data will NOT persist across server restarts."
            )
            return
        else:
            raise ValueError(
                "CRITICAL SECURITY ERROR: ENCRYPTION_KEY must be set in production (DEV_MODE=False)!"
            )
            
    # Key is set, validate and load it
    try:
        key_bytes = key.strip().encode()
        # Test if it decodes properly as base64 and is 32 bytes
        decoded = base64.urlsafe_b64decode(key_bytes)
        if len(decoded) != 32:
            raise ValueError("Key must decode to exactly 32 bytes")
        _fernet = Fernet(key_bytes)
    except Exception as e:
        if settings.DEV_MODE:
            logger.warning(
                f"⚠️ Invalid ENCRYPTION_KEY format ({e})! Generating transient key for dev fallback."
            )
            _fernet = Fernet(Fernet.generate_key())
            _fallback_used = True
        else:
            raise ValueError(
                f"CRITICAL SECURITY ERROR: ENCRYPTION_KEY is invalid: {e}. Key must be a URL-safe base64 key of 32 bytes."
            )

# Run initialization
init_encryption()

def encrypt_val(val: Optional[str]) -> Optional[str]:
    """Encrypt a string value. Returns None if input is None."""
    if val is None:
        return None
    if not isinstance(val, str):
        val = str(val)
    if not val.strip():
        return val # don't encrypt empty string / whitespace to save space
        
    try:
        encrypted_bytes = _fernet.encrypt(val.encode('utf-8'))
        return encrypted_bytes.decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to encrypt field: {e}")
        return val

def decrypt_val(val: Optional[str]) -> Optional[str]:
    """Decrypt a string value. If decryption fails or input is None/not encrypted, returns input."""
    if val is None:
        return None
    if not isinstance(val, str) or not val.strip():
        return val
        
    # Fernet ciphertexts always start with 'gAAAA' in base64
    if not val.startswith("gAAAA"):
        return val # probably not encrypted (plain text fallback)
        
    try:
        decrypted_bytes = _fernet.decrypt(val.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        # Fallback to returning original value to prevent UI crash for pre-existing plain text data
        logger.warning(f"Decryption failed (returning original plain text): {e}")
        return val
