import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  reload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen grid place-items-center px-6 bg-[#FDFBF7]">
          <div className="max-w-md text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 grid place-items-center mx-auto mb-5">
              <AlertTriangle size={26} />
            </div>
            <h1 className="font-heading text-3xl text-slate-900 mb-2">
              Qualcosa è andato storto
            </h1>
            <p className="text-sm text-slate-600 mb-6">
              Il Maestro ha inciampato. Ricarica la pagina — la tua sessione è salvata.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={this.reload}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-900 text-[#FDFBF7] font-medium text-sm hover:bg-emerald-800 transition-colors"
              >
                <RefreshCw size={14} /> Ricarica
              </button>
              <button
                onClick={this.reset}
                className="px-5 py-2.5 rounded-full bg-white border border-slate-900/10 text-slate-700 text-sm hover:border-emerald-800 transition-colors"
              >
                Ignora
              </button>
            </div>
            {this.state.error?.message && (
              <details className="mt-6 text-left">
                <summary className="text-xs font-mono uppercase tracking-widest text-slate-500 cursor-pointer">
                  Dettagli tecnici
                </summary>
                <pre className="mt-2 text-[10px] bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto font-mono">
                  {String(this.state.error.message)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
