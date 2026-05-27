import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../api';
import { API_URL } from '../config';

// Helper to convert VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check support and current subscription status
  useEffect(() => {
    const checkPushSupport = async () => {
      const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(pushSupported);

      if (!pushSupported) {
        setLoading(false);
        return;
      }

      setPermission(Notification.permission);

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking push subscription status:', err);
        setError('Error checking status');
      } finally {
        setLoading(false);
      }
    };

    checkPushSupport();
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported by this browser.');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        throw new Error('Notification permission denied.');
      }

      // 2. Fetch VAPID public key from backend
      const resKey = await authFetch(`${API_URL}/notifications/vapid-key`);
      if (!resKey.ok) {
        throw new Error('Failed to fetch VAPID public key from server.');
      }
      const { publicKey } = await resKey.json();

      // 3. Register push subscription with the browser
      const registration = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      // 4. Send subscription info to backend
      const subJson = subscription.toJSON();
      const resSubscribe = await authFetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh || '',
            auth: subJson.keys?.auth || ''
          },
          user_agent: navigator.userAgent
        })
      });

      if (!resSubscribe.ok) {
        throw new Error('Failed to save subscription on server.');
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      setError(err.message || 'Could not subscribe to push notifications.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        setIsSubscribed(false);
        setLoading(false);
        return true;
      }

      // 1. Delete subscription from backend
      const resUnsubscribe = await authFetch(`${API_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      if (!resUnsubscribe.ok) {
        console.warn('Backend failed to delete subscription');
      }

      // 2. Unsubscribe in the browser
      await subscription.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError('Could not unsubscribe.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe
  };
}
