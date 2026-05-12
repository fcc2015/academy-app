import { API_URL } from '../config';
import { authFetch } from '../api';

// Start impersonating a parent / player / coach.
// Stores user_id + name + role in localStorage so authFetch sends X-Impersonate-User.
// The admin stays on their current page — the impersonation banner will show.
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

    // Stay within the admin layout — the impersonation banner will indicate active session.
    // This avoids redirect issues with role-gated layouts (ParentLayout, CoachLayout).
    return data;
}

export function exitUserImpersonation() {
    localStorage.removeItem('impersonating_user_id');
    localStorage.removeItem('impersonating_user_name');
    localStorage.removeItem('impersonating_user_role');
}
