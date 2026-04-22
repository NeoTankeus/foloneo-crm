import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

// ErrorBoundary React : attrape toute erreur non geree dans l'arbre enfant
// et affiche un ecran de secours au lieu d'une page blanche. Permet a
// l'utilisateur de recharger ou retourner a l'accueil sans tout perdre.
//
// Auto-recovery : si l'error key change (navigation vers une autre route
// via setView), on reset l'erreur automatiquement.

interface Props {
  children: ReactNode;
  // Cle qui declenche un reset automatique quand elle change (ex: view actuelle)
  resetKey?: unknown;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log pour debug en dev + monitoring Vercel en prod (captures console)
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  componentDidUpdate(prevProps: Props): void {
    // Auto-reset si la resetKey change (navigation vers une autre vue)
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleHome = (): void => {
    // Retour a la racine : force un rechargement complet aussi
    window.location.href = "/";
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const message = this.state.error?.message ?? "Erreur inconnue";

    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Un incident est survenu
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Aucune donnée n'est perdue. Tu peux recharger la page ou retourner à l'accueil.
          </p>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-4 text-left">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              Détails techniques
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono break-words">
              {message}
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw size={13} />
              Réessayer
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-[#0B1E3F] text-white hover:bg-[#142A52]"
            >
              <RefreshCw size={13} />
              Recharger
            </button>
            <button
              onClick={this.handleHome}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Home size={13} />
              Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
}
