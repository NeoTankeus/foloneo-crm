import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { CalendarEvent, Account, Commercial } from "@/types";

// Type d'evenement qui par defaut s'attribue a un technicien (intervention terrain).
const TECH_EVENT_TYPES: CalendarEvent["type"][] = ["intervention", "tache"];

interface Props {
  open: boolean;
  event: CalendarEvent | null;
  accounts: Account[];
  commerciaux: Commercial[];
  defaultDate?: string;
  onClose: () => void;
  onSaved: (e: CalendarEvent) => void;
  onDeleted?: (id: string) => void;
}

const EMPTY: Omit<CalendarEvent, "id"> = {
  type: "rdv",
  title: "",
  accountId: undefined,
  commercialId: undefined,
  date: new Date().toISOString(),
  duree: 60,
  lieu: "",
  notes: "",
};

export function EventEditor({
  open,
  event,
  accounts,
  commerciaux,
  defaultDate,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [form, setForm] = useState<Omit<CalendarEvent, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      const { id: _id, ...rest } = event;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, date: defaultDate ?? new Date().toISOString() });
    }
    setError(null);
  }, [event, open, defaultDate]);

  function patch<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // Commerciaux / techs actifs, regroupes par role pour un dropdown lisible.
  // Ordre d'affichage : technicien > commercial > dirigeant (car le cas
  // metier principal de l'agenda est l'intervention terrain).
  const groupedAssignees = useMemo(() => {
    const actifs = commerciaux.filter((c) => c.actif !== false);
    return {
      technicien: actifs.filter((c) => c.role === "technicien"),
      commercial: actifs.filter((c) => c.role === "commercial"),
      dirigeant: actifs.filter((c) => c.role === "dirigeant"),
    };
  }, [commerciaux]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: CalendarEvent;
      if (event) {
        saved = useDemoData ? { ...event, ...form } : await db.updateEvent(event.id, form);
      } else {
        saved = useDemoData ? { ...form, id: uid("ev") } : await db.createEvent(form);
      }
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!event) return;
    if (!window.confirm(`Supprimer l'événement "${event.title}" ?`)) return;
    setSaving(true);
    try {
      if (!useDemoData) await db.deleteEvent(event.id);
      onDeleted?.(event.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de suppression");
    } finally {
      setSaving(false);
    }
  }

  // input type="datetime-local" exige format YYYY-MM-DDTHH:mm
  const dtLocalValue = form.date
    ? new Date(form.date).toISOString().slice(0, 16)
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? "Modifier l'événement" : "Nouvel événement"}
      size="md"
      footer={
        <>
          {event && onDeleted && (
            <Button variant="danger" icon={Trash2} onClick={remove} disabled={saving}>
              Supprimer
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            variant="primary"
            icon={Save}
            onClick={save}
            disabled={saving || !form.title}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Titre"
          required
          value={form.title}
          onChange={(e) => patch("title", e.target.value)}
          autoFocus
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => patch("type", e.target.value as typeof form.type)}
          >
            <option value="rdv">Rendez-vous</option>
            <option value="appel">Appel</option>
            <option value="visite">Visite</option>
            <option value="intervention">Intervention</option>
            <option value="rappel">Rappel</option>
            <option value="tache">Tâche</option>
          </Select>
          <Input
            label="Durée (min)"
            type="number"
            min={0}
            step={15}
            value={form.duree}
            onChange={(e) => patch("duree", Number(e.target.value))}
          />
        </div>
        <Input
          label="Date & heure"
          type="datetime-local"
          value={dtLocalValue}
          onChange={(e) => patch("date", new Date(e.target.value).toISOString())}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Compte"
            value={form.accountId ?? ""}
            onChange={(e) => patch("accountId", e.target.value || undefined)}
          >
            <option value="">—</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.raisonSociale}
              </option>
            ))}
          </Select>
          <Select
            label={TECH_EVENT_TYPES.includes(form.type) ? "Technicien assigné" : "Assigné à"}
            value={form.commercialId ?? ""}
            onChange={(e) => patch("commercialId", e.target.value || undefined)}
          >
            <option value="">— Non assigné —</option>
            {groupedAssignees.technicien.length > 0 && (
              <optgroup label="Techniciens">
                {groupedAssignees.technicien.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </optgroup>
            )}
            {groupedAssignees.commercial.length > 0 && (
              <optgroup label="Commerciaux">
                {groupedAssignees.commercial.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </optgroup>
            )}
            {groupedAssignees.dirigeant.length > 0 && (
              <optgroup label="Direction">
                {groupedAssignees.dirigeant.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </div>
        <Input
          label="Lieu"
          value={form.lieu ?? ""}
          onChange={(e) => patch("lieu", e.target.value)}
          placeholder="Adresse, visio, bureau…"
        />
        <Textarea
          label="Notes"
          rows={3}
          value={form.notes ?? ""}
          onChange={(e) => patch("notes", e.target.value)}
        />
        {error && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
