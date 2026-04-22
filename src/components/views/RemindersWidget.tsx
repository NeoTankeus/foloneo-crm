import { useMemo, useState } from "react";
import { Bell, Plus, CheckCircle2, Calendar as CalIcon, Trash2 } from "lucide-react";
import { Card, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { fmtDate, daysUntil, cx, uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import * as db from "@/lib/db";
import type { AppState, CalendarEvent } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

// Widget "Mes rappels" :
// Affiche les events de type "rappel"/"tache" non faits, rattaches au
// commercial connecte ou sans commercial_id. Permet :
//  - de cocher pour marquer "fait"
//  - de supprimer
//  - de creer un nouveau rappel rapide (titre + date)
export function RemindersWidget({ state, setState }: Props) {
  const { currentCommercial } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);

  const reminders = useMemo(() => {
    if (!currentCommercial) return [];
    return state.events
      .filter((e) => e.type === "rappel" || e.type === "tache")
      .filter((e) => !e.done)
      .filter((e) => !e.commercialId || e.commercialId === currentCommercial.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 8);
  }, [state.events, currentCommercial]);

  async function addReminder() {
    if (!newTitle.trim() || !currentCommercial) return;
    setSaving(true);
    try {
      const payload: Omit<CalendarEvent, "id"> = {
        type: "rappel",
        title: newTitle.trim(),
        date: new Date(`${newDate}T09:00:00`).toISOString(),
        duree: 15,
        commercialId: currentCommercial.id,
        done: false,
      };
      const saved = useDemoData
        ? { ...payload, id: uid("ev") }
        : await db.createEvent(payload);
      setState((s) => ({ ...s, events: [...s.events, saved] }));
      setNewTitle("");
    } catch (e) {
      console.error("[RemindersWidget] add failed:", e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone(ev: CalendarEvent) {
    const patched: CalendarEvent = { ...ev, done: !ev.done };
    setState((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === ev.id ? patched : e)),
    }));
    if (!useDemoData) {
      try {
        await db.updateEvent(ev.id, { done: patched.done });
      } catch (e) {
        // Rollback en cas d'erreur
        console.error("[RemindersWidget] toggle failed:", e);
        setState((s) => ({
          ...s,
          events: s.events.map((e) => (e.id === ev.id ? ev : e)),
        }));
      }
    }
  }

  async function remove(ev: CalendarEvent) {
    if (!window.confirm(`Supprimer "${ev.title}" ?`)) return;
    setState((s) => ({
      ...s,
      events: s.events.filter((e) => e.id !== ev.id),
    }));
    if (!useDemoData) {
      try {
        await db.deleteEvent(ev.id);
      } catch (e) {
        console.error("[RemindersWidget] delete failed:", e);
      }
    }
  }

  return (
    <Card className="p-4">
      <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Bell size={14} className="text-[#C9A961]" />
        Mes rappels
        {reminders.length > 0 && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#C9A961]/20 text-[#8B7228] dark:text-[#C9A961] font-semibold">
            {reminders.length}
          </span>
        )}
      </h2>

      {/* Formulaire rapide */}
      <div className="flex gap-2 mb-3">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Rappeler le client… Relancer devis… Appeler fournisseur…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addReminder();
            }
          }}
          className="flex-1"
        />
        <Input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-[140px] sm:w-[150px]"
        />
        <Button
          variant="gold"
          size="md"
          icon={Plus}
          onClick={() => void addReminder()}
          disabled={saving || !newTitle.trim()}
        >
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>

      {/* Liste */}
      {reminders.length === 0 ? (
        <div className="text-xs text-slate-500 py-4 text-center">
          Aucun rappel en cours. Ajoute-en un ci-dessus.
        </div>
      ) : (
        <div className="space-y-1">
          {reminders.map((r) => {
            const d = daysUntil(r.date);
            const overdue = d < 0;
            const today = d === 0;
            return (
              <div
                key={r.id}
                className={cx(
                  "group flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                  overdue && "bg-red-50/50 dark:bg-red-950/10"
                )}
              >
                <button
                  onClick={() => toggleDone(r)}
                  className={cx(
                    "w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                    r.done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-slate-300 dark:border-slate-600 hover:border-[#C9A961]"
                  )}
                  aria-label="Marquer comme fait"
                >
                  {r.done && <CheckCircle2 size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={cx("text-xs font-medium truncate", r.done && "line-through text-slate-400")}>
                    {r.title}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <CalIcon size={10} />
                    {fmtDate(r.date)}
                    {overdue && (
                      <span className="text-red-600 font-semibold">
                        · en retard de {Math.abs(d)}j
                      </span>
                    )}
                    {today && <span className="text-amber-600 font-semibold">· aujourd'hui</span>}
                    {!overdue && !today && d <= 7 && (
                      <span className="text-slate-500">· dans {d}j</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => void remove(r)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                  aria-label="Supprimer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
