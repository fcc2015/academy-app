import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Lightweight error boundary for individual page sections.
 * Unlike the global ErrorBoundary, this one:
 *   - Shows an inline error card (not a full-screen takeover)
 *   - Allows the rest of the page to continue working
 *   - Provides a retry button that re-mounts the failed section
 *
 * Usage:
 *   <SectionErrorBoundary name="Finances Chart">
 *     <FinancesChart />
 *   </SectionErrorBoundary>
 */
class SectionErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error(`[SectionErrorBoundary:${this.props.name || 'unknown'}]`, error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-white rounded-[2rem] border border-red-100 p-8 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 mb-4">
                        <AlertTriangle size={24} className="text-red-400" />
                    </div>
                    <h3 className="text-base font-black text-slate-800 mb-2">
                        {this.props.name ? `${this.props.name} — Error` : 'Section Error'}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mb-6 max-w-sm mx-auto">
                        This section encountered an unexpected error. The rest of the page is unaffected.
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
                    >
                        <RefreshCw size={14} />
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default SectionErrorBoundary;
