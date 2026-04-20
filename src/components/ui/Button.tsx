import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/lib/helpers";

export type ButtonVariant = "primary" | "gold" | "ghost" | "outline" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  children?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#0B1E3F] text-white hover:bg-[#142A52] disabled:bg-slate-300",
  gold: "bg-[#C9A961] text-[#0B1E3F] hover:bg-[#D4B570] disabled:bg-slate-200",
  ghost: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
  outline: "border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  subtle: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs gap-1",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}
