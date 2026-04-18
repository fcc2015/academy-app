/**
 * Native QR code scanner bridge.
 * On native (Capacitor): uses @capacitor/camera to capture a photo, then
 *   decodes the QR with html5-qrcode's file-scan API.
 * On web: returns null so the caller falls back to Html5Qrcode viewfinder.
 *
 * Usage:
 *   const result = await scanQRFromCamera();  // { data: '...' } | null
 */
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/**
 * Capture one photo from the native camera and decode any QR code found.
 * Returns the decoded string, or null if no QR / cancelled / web.
 */
export async function scanQRFromCamera() {
    if (!isNative) return null;

    try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

        // Ask for a photo from the back camera
        const photo = await Camera.getPhoto({
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera,
            quality: 80,
            allowEditing: false,
            correctOrientation: true,
        });

        if (!photo.base64String) return null;

        // Convert base64 → Blob → File so html5-qrcode can decode it
        const byteChars = atob(photo.base64String);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteArr[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([byteArr], { type: 'image/jpeg' });
        const file = new File([blob], 'qr-scan.jpg', { type: 'image/jpeg' });

        // Decode with html5-qrcode (file mode — no viewfinder needed)
        const { Html5Qrcode } = await import('html5-qrcode');
        const decoder = new Html5Qrcode('__native-qr-scratch__');
        try {
            const result = await decoder.scanFile(file, false);
            return result; // decoded string
        } finally {
            // Clean up hidden element
            decoder.clear().catch(() => {});
        }
    } catch (err) {
        // User cancelled camera or no QR found in photo
        if (
            err?.message?.includes('cancel') ||
            err?.message?.includes('Cancel') ||
            err?.message?.includes('No MultiFormat Readers')
        ) {
            return null;
        }
        console.warn('[nativeScanner] QR scan error:', err);
        return null;
    }
}

/** Whether we're on native (affects which scanner UI to show). */
export const isNativePlatform = isNative;
