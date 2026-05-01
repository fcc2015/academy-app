import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { authFetch } from '../api';

let cached = null;
let inflight = null;

export function usePlan() {
    const [plan, setPlan] = useState(cached);
    const [loading, setLoading] = useState(!cached);

    useEffect(() => {
        if (cached) return;
        if (!inflight) {
            inflight = authFetch(`${API_URL}/settings/plan`)
                .then(r => r.ok ? r.json() : { plan_id: 'free', features: { branches: false } })
                .catch(() => ({ plan_id: 'free', features: { branches: false } }))
                .then(data => { cached = data; inflight = null; return data; });
        }
        inflight.then(data => { setPlan(data); setLoading(false); });
    }, []);

    return {
        plan,
        loading,
        hasFeature: (name) => !!plan?.features?.[name],
        academyName: plan?.academy_name || null,
        branchesAssigned: plan?.branches_assigned || [],
    };
}
