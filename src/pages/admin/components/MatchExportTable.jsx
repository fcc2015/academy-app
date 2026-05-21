import React from 'react';

const MatchExportTable = ({
    exportRef,
    academySettings,
    filteredMatches = [],
    squads = [],
    coaches = [],
    parseRowMeta
}) => {
    const academyName = (academySettings?.academy_name || 'CLUB').toUpperCase();
    const academyLogo = academySettings?.logo_url;
    const academyNameUpper = academyName;

    // Compute weekend range
    const dates = filteredMatches.map(m => new Date(m.match_date)).filter(d => !isNaN(d));
    const dateMin = dates.length ? new Date(Math.min(...dates)) : new Date();
    const dateMax = dates.length ? new Date(Math.max(...dates)) : new Date();
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const monthName = months[dateMin.getMonth()];
    const sameMonth = dateMin.getMonth() === dateMax.getMonth() && dateMin.getFullYear() === dateMax.getFullYear();
    const weekendLabel = sameMonth
        ? `Week-End ${String(dateMin.getDate()).padStart(2, '0')} et ${String(dateMax.getDate()).padStart(2, '0')} ${monthName} ${dateMax.getFullYear()}`
        : `${String(dateMin.getDate()).padStart(2, '0')}/${String(dateMin.getMonth()+1).padStart(2, '0')} — ${String(dateMax.getDate()).padStart(2, '0')}/${String(dateMax.getMonth()+1).padStart(2, '0')} ${dateMax.getFullYear()}`;

    // Helpers
    const dayFr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const fmtDate = (iso) => {
        const d = new Date(iso);
        return `${dayFr[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
    };
    const fmtTime = (iso) => {
        const d = new Date(iso);
        return `${String(d.getHours()).padStart(2, '0')}H${String(d.getMinutes()).padStart(2, '0')}`;
    };
    const coachFor = (match) => {
        const typed = parseRowMeta(match.notes).coachName;
        if (typed) return typed;
        const sq = squads.find(s => s.id === match.squad_id);
        if (!sq) return '';
        return sq.coaches?.full_name || sq.coach_name || (coaches.find(c => c.id === sq.coach_id)?.full_name) || '';
    };

    const HEADER_BLUE = '#1e40af';
    const ROW_ALT = '#dbeafe';
    const RED = '#dc2626';
    const GREEN = '#16a34a';

    return (
        <div
            ref={exportRef}
            style={{
                position: 'fixed',
                left: '-10000px',
                top: 0,
                width: '1280px',
                backgroundColor: '#ffffff',
                fontFamily: 'Arial, Helvetica, sans-serif',
                padding: '32px',
            }}
            aria-hidden="true"
        >
            {/* Academy logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                {academyLogo ? (
                    <img src={academyLogo} alt="logo" crossOrigin="anonymous" style={{ height: '110px', objectFit: 'contain' }} />
                ) : (
                    <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 900 }}>
                        {academyNameUpper.charAt(0)}
                    </div>
                )}
            </div>

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, letterSpacing: '0.02em', color: '#1e293b' }}>
                    PROGRAMME DES MATCHES <span style={{ color: '#0284c7' }}>{academyNameUpper}</span> <span style={{ color: GREEN }}>CLUB</span>
                </h1>
            </div>

            {/* Subtitle */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '20px', fontStyle: 'italic', color: '#1e293b' }}>{weekendLabel}</p>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', border: '2px solid #1e3a8a' }}>
                <thead>
                    <tr style={{ background: HEADER_BLUE, color: '#ffffff' }}>
                        {['Cat', 'Date', 'Domicile', 'Visiteur', 'Heure', 'Terrain', 'Coach', 'Kit'].map(h => (
                            <th key={h} style={{ padding: '10px 8px', textAlign: 'center', fontSize: '15px', fontWeight: 900, border: '1px solid #1e3a8a' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filteredMatches.map((match, idx) => {
                        const meta = parseRowMeta(match.notes);
                        const isAway = meta.isAway;
                        const homeTeam = isAway ? (match.opponent_name || '—') : academyNameUpper;
                        const visitorTeam = isAway ? academyNameUpper : (match.opponent_name || '—');
                        const isCancelled = match.status === 'Cancelled';
                        const showRed = match.status === 'Postponed' ? 'EN ATTENTE' : (isCancelled ? 'REPORTÉ' : null);
                        const rowBg = idx % 2 === 0 ? '#ffffff' : ROW_ALT;
                        const cell = { padding: '8px 10px', border: '1px solid #93c5fd', textAlign: 'center', fontWeight: 700, fontSize: '14px', color: '#0f172a' };
                        const isOurHome = !isAway;
                        const isOurVisit = isAway;

                        return (
                            <tr key={match.id} style={{ background: rowBg }}>
                                <td style={{ ...cell, color: HEADER_BLUE, fontWeight: 900 }}>
                                    {match.category || '—'}
                                </td>
                                <td style={cell}>
                                    {showRed ? <span style={{ color: RED, fontWeight: 900 }}>{showRed}</span> : fmtDate(match.match_date)}
                                </td>
                                <td style={{ ...cell, color: isOurHome ? GREEN : '#0f172a', fontWeight: 900 }}>{homeTeam}</td>
                                <td style={{ ...cell, color: isOurVisit ? GREEN : '#0f172a', fontWeight: 900 }}>{visitorTeam}</td>
                                <td style={cell}>
                                    {showRed ? '' : fmtTime(match.match_date)}
                                </td>
                                <td style={cell}>
                                    {showRed ? <span style={{ color: RED, fontWeight: 900 }}>{showRed}</span> : (match.location || '—')}
                                </td>
                                <td style={cell}>
                                    {showRed ? <span style={{ color: RED, fontWeight: 900 }}>{showRed}</span> : (coachFor(match) || '—')}
                                </td>
                                <td style={cell}>
                                    {meta.kitColor ? (
                                        <span style={{ display: 'inline-block', width: 28, height: 28, borderRadius: 6, background: meta.kitColor, border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }} title={meta.kitColor} />
                                    ) : '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default MatchExportTable;
