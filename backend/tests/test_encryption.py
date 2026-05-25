import pytest
from core.encryption import encrypt_val, decrypt_val

def test_encryption_decryption_cycle():
    plain_text = "Patient has mild asthma."
    encrypted = encrypt_val(plain_text)
    
    assert encrypted is not None
    assert encrypted != plain_text
    assert encrypted.startswith("gAAAA")
    
    decrypted = decrypt_val(encrypted)
    assert decrypted == plain_text

def test_encryption_handles_none_and_empty():
    assert encrypt_val(None) is None
    assert decrypt_val(None) is None
    
    assert encrypt_val("") == ""
    assert decrypt_val("") == ""
    
    assert encrypt_val("   ") == "   "
    assert decrypt_val("   ") == "   "

def test_decryption_fallback_for_plain_text():
    # If it is not a Fernet ciphertext, it returns as is
    plain_text = "Some legacy data"
    decrypted = decrypt_val(plain_text)
    assert decrypted == plain_text

def test_decryption_fallback_on_corrupt_ciphertext():
    # Ciphertext starts with gAAAA but is invalid/truncated
    corrupt_cipher = "gAAAA_invalid_base64_or_wrong_key"
    decrypted = decrypt_val(corrupt_cipher)
    assert decrypted == corrupt_cipher
