import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useIdleTimer — نظام أمان الجلسة
 * 
 * يراقب: الماوس، الكيبورد، اللمس، السكرول، الكليك
 * بعد IDLE_TIMEOUT (10 دقائق) بدون أي نشاط → تسجيل خروج تلقائي
 * يعرض تحذير قبل WARNING_BEFORE (60 ثانية) من انتهاء الجلسة
 */

const IDLE_TIMEOUT = 10 * 60 * 1000;     // 10 دقائق
const WARNING_BEFORE = 60 * 1000;         // تحذير قبل 60 ثانية
const CHECK_INTERVAL = 1000;              // فحص كل ثانية

const EVENTS = [
    'mousemove', 'mousedown', 'keydown', 'keypress',
    'touchstart', 'touchmove', 'scroll', 'click', 'wheel'
];

export function useIdleTimer(onLogout) {
    const [showWarning, setShowWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(60);
    const lastActivityRef = useRef(Date.now());
    const timerRef = useRef(null);

    // تحديث وقت آخر نشاط
    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        setShowWarning(false);
    }, []);

    // تمديد الجلسة يدوياً (من زر "أنا هنا")
    const extendSession = useCallback(() => {
        resetTimer();
    }, [resetTimer]);

    useEffect(() => {
        // إضافة المراقبين
        EVENTS.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

        // فحص دوري
        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;
            const remaining = IDLE_TIMEOUT - elapsed;

            if (remaining <= 0) {
                // ⏰ انتهى الوقت → تسجيل خروج
                clearInterval(timerRef.current);
                EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
                onLogout();
            } else if (remaining <= WARNING_BEFORE) {
                // ⚠️ تحذير
                setShowWarning(true);
                setRemainingSeconds(Math.ceil(remaining / 1000));
            } else {
                setShowWarning(false);
            }
        }, CHECK_INTERVAL);

        return () => {
            clearInterval(timerRef.current);
            EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [resetTimer, onLogout]);

    return { showWarning, remainingSeconds, extendSession };
}

export default useIdleTimer;
