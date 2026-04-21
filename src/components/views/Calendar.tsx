import { useMemo, useState } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
} from "lucide-react";
import { Card, Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/overlays";
import { EventEditor } from "@/components/modals/EventEditor";
import { fmtDateTime, upsertById, removeById, cx } from "@/lib/helpers";
import type { AppState, CalendarEvent } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const TYPE_COLORS: Record<CalendarEvent["type"], string> = {
  rdv: "#60A5FA",
  appel: "#A78BFA",
  visite: "#F59E0B",
  intervention: "#10B981",
  rappel: "#C9A961",
  tache: "#94A3B8",
};

const TYPE_LABELS: Record<CalendarEvent["type"], string> = {
  rdv: "RDV",
  appel: "Appel",
  visite: "Visite",
  intervention: "Intervention",
  rappel: "Rappel",
  tache: "Tâche",
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function CalendarView({ state, setState }: Props) {
  const [editor, setEditor] = useState<{ open: boolean; event: CalendarEvent | null; date?: string }>({
    open: false,
    event: null,
  });
  const [commercialId, setCommercialId] = useState<string | "all">("all");
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());

  const filteredEvents = useMemo(
    () =>
      state.events.filter(
        (e) => commercialId === "all" || e.commercialId === commercialId
      ),
    [state.events, commercialId]
  );

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const firstDow = (start.getDay() + 6) % 7; // lundi = 0
    const total = end.getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= total; d++) days.push(new Date(month.getFullYear(), month.getMonth(), d));
    return days;
  }, [month]);

  const eventsByDay = useMemo(() => {
    const m: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((e) => {
      const k = new Date(e.date).toDateString();
      (m[k] ??= []).push(e);
    });
    return m;
  }, [filteredEvents]);

  const eventsOnSelected = eventsByDay[selected.toDateString()] ?? [];
  const sortedSelected = [...eventsOnSelected].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            icon={ChevronLeft}
            size="sm"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          />
          <div className="font-semibold text-lg capitalize px-2">
            {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </div>
          <Button
            variant="ghost"
            icon={ChevronRight}
            size="sm"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date();
            setMonth(startOfMonth(now));
            setSelected(now);
          }}
        >
          Aujourd'hui
        </Button>
        <Select
          value={commercialId}
          onChange={(e) => setCommercialId(e.target.value)}
          className="max-w-[220px]"
        >
          <option value="all">Toute l'équipe</option>
          {/* Techniciens en premier (cas metier : interventions terrain), puis commerciaux, puis direction */}
          {(["technicien", "commercial", "dirigeant"] as const).map((role) => {
            const group = state.commerciaux.filter(
              (c) => c.role === role && c.actif !== false
            );
            if (group.length === 0) return null;
            const label =
              role === "technicien"
                ? "Techniciens"
                : role === "commercial"
                ? "Commerciaux"
                : "Direction";
            return (
              <optgroup key={role} label={label}>
                {group.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </Select>
        <div className="flex-1" />
        <Button
          variant="gold"
          icon={Plus}
          onClick={() =>
            setEditor({
              open: true,
              event: null,
              date: selected.toISOString(),
            })
          }
        >
          Nouvel événement
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Grille mensuelle */}
        <Card className="p-3 lg:col-span-2 overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-slate-500 uppercase mb-2 min-w-[400px]">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 min-w-[400px]">
            {daysInMonth.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const key = d.toDateString();
              const evts = eventsByDay[key] ?? [];
              const isSelected = sameDay(d, selected);
              const isToday = sameDay(d, new Date());
              return (
                <button
                  key={key}
                  onClick={() => setSelected(d)}
                  className={cx(
                    "min-h-[68px] p-1.5 rounded-lg text-left transition-colors border",
                    isSelected
                      ? "bg-[#0B1E3F] text-white border-[#0B1E3F]"
                      : isToday
                        ? "border-[#C9A961] bg-[#F8F0DC] dark:bg-[#C9A961]/10"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className={cx("text-xs font-semibold", isSelected && "text-white")}>
                    {d.getDate()}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {evts.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="h-1.5 rounded-full"
                        style={{ background: TYPE_COLORS[e.type] }}
                      />
                    ))}
                    {evts.length > 3 && (
                      <div className={cx("text-[9px]", isSelected ? "text-white/70" : "text-slate-400")}>
                        +{evts.length - 3}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Liste du jour */}
        <Card className="p-4">
          <div className="font-semibold mb-3 flex items-center gap-2">
            <CalendarIcon size={14} className="text-[#C9A961]" />
            {selected.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
          {sortedSelected.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="Pas d'événement"
              description="Ajoute un RDV, appel ou visite."
            />
          ) : (
            <div className="space-y-2">
              {sortedSelected.map((e) => {
                const acc = e.accountId
                  ? state.accounts.find((a) => a.id === e.accountId)
                  : undefined;
                const com = e.commercialId
                  ? state.commerciaux.find((c) => c.id === e.commercialId)
                  : undefined;
                return (
                  <button
                    key={e.id}
                    onClick={() => setEditor({ open: true, event: e })}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-1.5 self-stretch rounded-full flex-shrink-0"
                        style={{ background: TYPE_COLORS[e.type] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge tone="slate">{TYPE_LABELS[e.type]}</Badge>
                          <div className="text-xs text-slate-500">
                            {fmtDateTime(e.date)} · {e.duree} min
                          </div>
                        </div>
                        <div className="font-medium text-sm mt-1 truncate">{e.title}</div>
                        {acc && (
                          <div className="text-xs text-slate-500 truncate">
                            {acc.raisonSociale}
                          </div>
                        )}
                        <div className="flex gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                          {e.lieu && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={10} />
                              {e.lieu}
                            </span>
                          )}
                          {com && (
                            <span className="inline-flex items-center gap-1">
                              <User size={10} />
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ background: com.couleur }}
                              />
                              {com.prenom}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <EventEditor
        open={editor.open}
        event={editor.event}
        accounts={state.accounts}
        commerciaux={state.commerciaux}
        defaultDate={editor.date}
        onClose={() => setEditor({ open: false, event: null })}
        onSaved={(e) => setState((s) => ({ ...s, events: upsertById(s.events, e) }))}
        onDeleted={(id) => setState((s) => ({ ...s, events: removeById(s.events, id) }))}
      />
    </div>
  );
}
