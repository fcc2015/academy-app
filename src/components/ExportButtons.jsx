import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { API_URL } from '../config';

/**
 * Reusable export buttons component for CSV downloads.
 * 
 * Usage:
 *   <ExportButtons type="players" />
 *   <ExportButtons type="payments" />
 *   <ExportButtons type="attendance" squadId="xxx" />
 */
export default function ExportButtons({ type = 'players', squadId = null }) {
    const handleExport = async (format) => {
        try {
            let url = `${API_URL}/exports/${type}/csv`;
            if (squadId) url += `?squad_id=${squadId}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('Export error:', err);
            alert('Erreur lors de l\'export');
        }
    };

    return (
        <div style={{ display: 'flex', gap: 8 }}>
            <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 hover:shadow-md"
                style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                }}
            >
                <FileSpreadsheet size={14} />
                CSV
            </button>
        </div>
    );
}
