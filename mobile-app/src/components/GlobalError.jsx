import React from 'react';

class GlobalError extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-10 font-mono">
                    <div className="max-w-4xl w-full bg-white p-6 rounded-2xl shadow-xl border border-red-200 overflow-auto">
                        <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong.</h1>
                        <p className="mb-4 text-slate-700">The application crashed with the following error:</p>
                        <div className="bg-slate-900 text-red-300 p-4 rounded-xl text-sm overflow-x-auto mb-4">
                            {this.state.error && this.state.error.toString()}
                        </div>
                        <details className="whitespace-pre-wrap text-xs text-slate-500">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </details>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="mt-6 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalError;
