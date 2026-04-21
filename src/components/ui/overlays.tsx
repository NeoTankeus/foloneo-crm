import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
import { cx } from "@/lib/helpers";
import { Card } from "./primitives";

// ============================================================================
// MODAL
// ============================================================================
// Mobile : plein-ecran (inset-0, pas de padding, pas de coins arrondis)
// Desktop (>=sm) : centre avec max-width par taille, coins arrondis, max-height 95vh.
// La modale s'adapte automatiquement — pas d'option supplementaire necessaire.
type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

const modalSizes: Record<ModalSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-6xl",
  full: "sm:max-w-[95vw]",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  size?: ModalSize;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={cx(
          "w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slideUp overflow-hidden",
          // Mobile : plein ecran
          "h-dvh sm:h-auto sm:max-h-[95vh]",
          // Coins arrondis uniquement desktop
          "rounded-none sm:rounded-2xl",
          modalSizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <header className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0 pt-safe sm:pt-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate pr-3">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="p-2 -mr-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex-shrink-0"
            >
              <X size={18} />
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer && (
          <footer className="px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 flex-shrink-0 bg-slate-50 dark:bg-slate-900/50 pb-safe sm:pb-3 flex-wrap">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STAT
// ============================================================================
export type StatTone = "emerald" | "amber" | "red" | "gold" | "navy" | "slate" | "blue";

const statTones: Record<StatTone, string> = {
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
  gold: "bg-[#F8F0DC] text-[#8B7228] dark:bg-[#C9A961]/20 dark:text-[#C9A961]",
  navy: "bg-[#0B1E3F]/5 text-[#0B1E3F] dark:bg-[#C9A961]/10 dark:text-[#C9A961]",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
};

export function Stat({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  tone = "navy",
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
  icon?: LucideIcon;
  tone?: StatTone;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {label}
          </div>
          <div className="text-2xl font-semibold mt-1 text-slate-900 dark:text-slate-100 truncate">
            {value}
          </div>
          {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
          {typeof trend === "number" && (
            <div
              className={cx(
                "inline-flex items-center gap-1 text-xs font-medium mt-2",
                trend >= 0 ? "text-emerald-600" : "text-red-600"
              )}
            >
              {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend >= 0 ? "+" : ""}{trend}%
            </div>
          )}
        </div>
        {Icon && (
          <div className={cx("p-2 rounded-lg", statTones[tone])}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================
export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
