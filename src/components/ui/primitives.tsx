import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, MouseEvent } from "react";
import { cx } from "@/lib/helpers";

// ============================================================================
// CARD
// ============================================================================
export function Card({
  children,
  className = "",
  hover = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl",
        hover && "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// INPUT
// ============================================================================
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = "", ...props }: InputProps) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>}
      <input
        {...props}
        className={cx(
          "w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400",
          error ? "border-red-300 dark:border-red-700" : "border-slate-200 dark:border-slate-700",
          className
        )}
      />
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// ============================================================================
// SELECT
// ============================================================================
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children?: ReactNode;
}

export function Select({ label, className = "", children, ...props }: SelectProps) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>}
      <select
        {...props}
        className={cx(
          "w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100",
          className
        )}
      >
        {children}
      </select>
    </div>
  );
}

// ============================================================================
// TEXTAREA
// ============================================================================
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, rows = 3, className = "", ...props }: TextareaProps) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>}
      <textarea
        {...props}
        rows={rows}
        className={cx(
          "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400",
          className
        )}
      />
    </div>
  );
}

// ============================================================================
// BADGE
// ============================================================================
export type BadgeTone = "slate" | "blue" | "violet" | "amber" | "emerald" | "red" | "gold" | "navy";

const badgeTones: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  gold: "bg-[#F8F0DC] text-[#8B7228] dark:bg-[#C9A961]/20 dark:text-[#C9A961]",
  navy: "bg-[#0B1E3F] text-white",
};

export function Badge({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
