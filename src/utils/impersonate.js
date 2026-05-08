import { API_URL } from '../config';
import { authFetch } from '../api';

// Start impersonating a parent / player / coach.
// Stores user_id + name + role in localStorage so authFetch sends X-Impersonate-User.
// Then redirects to the matching dashboard for that role.
export async function impersonateUser(userId) {
    const res = await authFetch(`${API_URL}/admins/impersonate-user/${userId}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const data = await res.json();
    localStorage.setItem('impersonating_user_id', data.user_id);
    localStorage.setItem('impersonating_user_name', data.full_name || data.email || '');
    localStorage.setItem('impersonating_user_role', data.role || '');

    // Send the impersonator to the dashboard the target role normally lands on.
    const role = (data.role || '').toLowerCase();
    const target =
        role === 'parent' ? '/parent/dashboard' :
        role === 'coach'  ? '/coach/dashboard'  :
        role === 'player' ? '/parent/dashboard' :  // players use parent layout via QR flow
        '/admin/dashboard';
    window.location.href = target;
}

export function exitUserImpersonation() {
    localStorage.removeItem('impersonating_user_id');
    localStorage.removeItem('impersonating_user_name');
    localStorage.removeItem('impersonating_user_role');
}
