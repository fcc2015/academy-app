/**
 * Capacitor native bridge — wraps native APIs with web fallbacks.
 * All functions are safe to call on web (they just no-op or return defaults).
 *
 * Usage:
 *   import { isNative, requestPushPermission, hapticImpact } from '../native/capacitor';
 */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// ─── Splash Screen ──────────────────────────────────────────
export async function hideSplash() {
    if (!isNative) return;
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
    } catch { /* ignore */ }
}

// ─── Status Bar ─────────────────────────────────────────────
export async function setStatusBarStyle(style = 'Dark') {
    if (!isNative) return;
    try {
        const { StatusBar } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style });
    } catch { /* ignore */ }
}

// ─── Push Notifications ─────────────────────────────────────
export async function requestPushPermission() {
    if (!isNative) return false;
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === 'granted') {
            await PushNotifications.register();
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

export function onPushToken(callback) {
    if (!isNative) return () => {};
    import('@capacitor/push-notifications').then(({ PushNotifications }) => {
        PushNotifications.addListener('registration', (token) => callback(token.value));
        PushNotifications.addListener('registrationError', (err) => {
            console.error('Push registration error:', err);
        });
    });
    return () => {
        import('@capacitor/push-notifications').then(({ PushNotifications }) => {
            PushNotifications.removeAllListeners();
        });
    };
}

export function onPushMessage(callback) {
    if (!isNative) return () => {};
    import('@capacitor/push-notifications').then(({ PushNotifications }) => {
        PushNotifications.addListener('pushNotificationReceived', callback);
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            callback(action.notification);
        });
    });
    return () => {
        import('@capacitor/push-notifications').then(({ PushNotifications }) => {
            PushNotifications.removeAllListeners();
        });
    };
}

// ─── Haptics ────────────────────────────────────────────────
export async function hapticImpact(style = 'Medium') {
    if (!isNative) return;
    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle[style] ?? ImpactStyle.Medium });
    } catch { /* ignore */ }
}

export async function hapticNotification(type = 'Success') {
    if (!isNative) return;
    try {
        const { Haptics, NotificationType } = await import('@capacitor/haptics');
        await Haptics.notification({ type: NotificationType[type] ?? NotificationType.Success });
    } catch { /* ignore */ }
}

// ─── Network ────────────────────────────────────────────────
export async function getNetworkStatus() {
    if (!isNative) return { connected: navigator.onLine, connectionType: 'unknown' };
    try {
        const { Network } = await import('@capacitor/network');
        return Network.getStatus();
    } catch {
        return { connected: navigator.onLine, connectionType: 'unknown' };
    }
}

export function onNetworkChange(callback) {
    if (!isNative) {
        const handler = () => callback({ connected: navigator.onLine });
        window.addEventListener('online', handler);
        window.addEventListener('offline', handler);
        return () => {
            window.removeEventListener('online', handler);
            window.removeEventListener('offline', handler);
        };
    }
    import('@capacitor/network').then(({ Network }) => {
        Network.addListener('networkStatusChange', callback);
    });
    return () => {
        import('@capacitor/network').then(({ Network }) => {
            Network.removeAllListeners();
        });
    };
}
