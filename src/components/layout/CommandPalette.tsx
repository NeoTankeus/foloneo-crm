import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Users,
  FileText,
  Package,
  Wrench,
  Receipt,
  UserCog,
  Calendar,
  LifeBuoy,
  Settings as SettingsIcon,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/lib/helpers";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  shortcut?: string;
  action: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  setView: (v: string) => void;
  onNewQuote: () => void;
}

export function CommandPalette({ open, onClose, setView, onNewQuote }: Props) {
  const [query, setQuery] = useState<string>("");
  const [selected, setSelected] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "new-quote",
        label: "Nouveau devis",
        hint: "Ouvre le wizard",
        icon: Plus,
        shortcut: "N",
        action: () => {
          setView("quotes");
          onNewQuote();
        },
      },
      { id: "v-dashboard", label: "Aller au tableau de bord", icon: LayoutDashboard, action: () => setView("dashboard") },
      { id: "v-pipeline", label: "Aller au pipeline", icon: Briefcase, action: () => setView("pipeline") },
      { id: "v-accounts", label: "Aller aux comptes", icon: Building2, action: () => setView("accounts") },
      { id: "v-contacts", label: "Aller aux contacts", icon: Users, action: () => setView("contacts") },
      { id: "v-quotes", label: "Aller aux devis", icon: FileText, action: () => setView("quotes") },
      { id: "v-catalog", label: "Aller au catalogue", icon: Package, action: () => setView("catalog") },
      { id: "v-maintenance", label: "Aller à la maintenance", icon: Wrench, action: () => setView("maintenance") },
      { id: "v-invoices", label: "Aller à la facturation", icon: Receipt, action: () => setView("invoices") },
      { id: "v-team", label: "Aller à l'équipe", icon: UserCog, action: () => setView("team") },
      { id: "v-calendar", label: "Aller à l'agenda", icon: Calendar, action: () => setView("calendar") },
      { id: "v-sav", label: "Aller au SAV", icon: LifeBuoy, action: () => setView("sav") },
      { id: "v-settings", label: "Aller aux paramètres", icon: SettingsIcon, action: () => setView("settings") },
    ],
    [setView, onNewQuote]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  if (!open) return null;

  function exec(c: Command) {
    c.action();
    onClose();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[selected];
      if (c) exec(c);
    } else if (e.key === "Escape") {
      onClose();
    } else if (e.key === "n" && (e.ctrlKey || e.metaKey) === false && query === "") {
      // Raccourci "N" pour nouveau devis quand la recherche est vide
      const newQuote = commands.find((c) => c.id === "new-quote");
      if (newQuote) {
        e.preventDefault();
        exec(newQuote);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Tape pour chercher une commande ou une vue…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
          />
          <span className="text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">
            Esc
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-xs text-slate-500 px-4 py-6 text-center">
              Aucune commande trouvée
            </div>
          )}
          {filtered.map((c, i) => {
            const Icon = c.icon;
            const active = i === selected;
            return (
              <button
                key={c.id}
                onClick={() => exec(c)}
                onMouseEnter={() => setSelected(i)}
                className={cx(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "bg-[#0B1E3F] text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <Icon size={14} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{c.label}</div>
                  {c.hint && (
                    <div className={cx("text-[10px] truncate", active ? "text-white/70" : "text-slate-400")}>
                      {c.hint}
                    </div>
                  )}
                </div>
                {c.shortcut && (
                  <span
                    className={cx(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                      active ? "border-white/30" : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {c.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-3">
          <span>↑↓ naviguer</span>
          <span>↵ exécuter</span>
          <span>N nouveau devis</span>
        </div>
      </div>
    </div>
  );
}
