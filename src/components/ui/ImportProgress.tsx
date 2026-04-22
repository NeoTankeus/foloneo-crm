import { Loader2 } from "lucide-react";

export interface ImportProgressState {
  done: number;
  total: number;
  current?: string; // Label de l'item en cours (raison sociale / numero devis...)
}

// Barre de progression affichee pendant l'import. Rendu visuellement
// coherent avec le reste du design (navy/gold). Utilise par les 3 modales
// Sellsy (accounts / quotes / invoices).
export function ImportProgress({ state }: { state: ImportProgressState }) {
  const pct = state.total > 0 ? Math.min(100, Math.round((state.done / state.total) * 100)) : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 size={16} className="animate-spin text-[#C9A961]" />
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          Import en cours…
        </span>
        <span className="ml-auto text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
          {state.done} / {state.total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#C9A961] transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      {state.current && (
        <div className="text-[11px] text-slate-500 truncate" title={state.current}>
          Ligne en cours : <span className="font-medium text-slate-700 dark:text-slate-300">{state.current}</span>
        </div>
      )}
      <div className="text-[10px] text-slate-400">
        L'import peut prendre quelques secondes selon le nombre de lignes et la vitesse réseau.
      </div>
    </div>
  );
}
