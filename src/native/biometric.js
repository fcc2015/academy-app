/**
 * Biometric authentication bridge using capacitor-native-biometric.
 * Works on iOS (Face ID / Touch ID) and Android (fingerprint / face).
 * All functions gracefully no-op on web.
 */
import { Capacitor } from '@capacitor/core';

const SERVER = 'com.dbadmin.academy';
const isNative = Capacitor.isNativePlatform();

async function getBiometric() {
    if (!isNative) return null;
    const { NativeBiometric } = await import('capacitor-native-biometric');
    return NativeBiometric;
}

/** Check if biometric is available on this device. */
export async function isBiometricAvailable() {
    if (!isNative) return false;
    try {
        const NativeBiometric = await getBiometric();
        const result = await NativeBiometric.isAvailable();
        return result.isAvailable;
    } catch {
        return false;
    }
}

/** Check if saved biometric credentials exist (from a previous login). */
export async function hasBiometricCredentials() {
    if (!isNative) return false;
    try {
        const NativeBiometric = await getBiometric();
        const creds = await NativeBiometric.getCredentials({ server: SERVER });
        return !!(creds?.username && creds?.password);
    } catch {
        return false;
    }
}

/**
 * Prompt biometric verification and return saved credentials if successful.
 * Returns { username, password } or null if failed / cancelled.
 */
export async function loginWithBiometric() {
    if (!isNative) return null;
    try {
        const NativeBiometric = await getBiometric();

        // Verify identity first
        await NativeBiometric.verifyIdentity({
            reason: 'Confirm your identity',
            title: 'Football Academy',
            subtitle: 'Biometric login',
            description: 'Use fingerprint or face to sign in',
            negativeButtonText: 'Cancel',
            maxAttempts: 3,
        });

        // Retrieve stored credentials
        const creds = await NativeBiometric.getCredentials({ server: SERVER });
        return creds ?? null;
    } catch (err) {
        // User cancelled or biometric failed — not an error
        if (err?.message?.includes('cancel') || err?.message?.includes('Cancel')) return null;
        console.warn('Biometric login failed:', err);
        return null;
    }
}

/**
 * Save credentials securely in the device keychain/keystore.
 * Call this after a successful email+password login.
 */
export async function saveBiometricCredentials(email, password) {
    if (!isNative) return;
    try {
        const NativeBiometric = await getBiometric();
        await NativeBiometric.setCredentials({
            username: email,
            password: password,
            server: SERVER,
        });
    } catch (err) {
        console.warn('Could not save biometric credentials:', err);
    }
}

/** Remove saved credentials (call on logout or password change). */
export async function clearBiometricCredentials() {
    if (!isNative) return;
    try {
        const NativeBiometric = await getBiometric();
        await NativeBiometric.deleteCredentials({ server: SERVER });
    } catch { /* already cleared */ }
}
