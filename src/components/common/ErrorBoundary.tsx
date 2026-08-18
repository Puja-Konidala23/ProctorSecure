import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  declare props: Props;
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  handleReload = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F1113] text-[#E0E0E0] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full rounded-2xl bg-[#1A1D1F] border border-[#2C2F33] p-8 shadow-2xl space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-[#A0A0A0] font-mono bg-[#0F1113] p-3 rounded-lg border border-[#2C2F33] text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown render exception'}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold transition shadow-md cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Reset & Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
