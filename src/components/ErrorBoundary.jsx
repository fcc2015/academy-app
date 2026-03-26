import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    className="min-h-screen flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
                >
                    <div className="text-center px-6 max-w-md">
                        <div
                            className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] mb-6"
                            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}
                        >
                            <AlertTriangle size={36} className="text-red-400" />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-3">
                            Une erreur est survenue
                        </h2>
                        <p className="text-indigo-300/60 text-sm font-medium mb-8">
                            L'application a rencontré un problème inattendu. Essayez de rafraîchir la page.
                        </p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm text-white transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    boxShadow: '0 8px 32px rgba(79,70,229,0.4)',
                                }}
                            >
                                <RefreshCw size={16} />
                                Réessayer
                            </button>
                        </div>

                        {this.state.error && (
                            <div
                                className="mt-6 p-4 rounded-xl text-left text-xs font-mono overflow-auto max-h-32"
                                style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    color: '#fca5a5'
                                }}
                            >
                                {this.state.error.toString()}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
