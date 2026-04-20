import { useEffect, useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { SavTicket, Account } from "@/types";

interface Props {
  open: boolean;
  ticket: SavTicket | null;
  accounts: Account[];
  onClose: () => void;
  onSaved: (t: SavTicket) => void;
  onDeleted?: (id: string) => void;
}

const EMPTY: Omit<SavTicket, "id" | "createdAt"> = {
  numero: undefined,
  accountId: "",
  objet: "",
  description: "",
  status: "ouvert",
  priorite: "normale",
};

export function SavEditor({ open, ticket, accounts, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<Omit<SavTicket, "id" | "createdAt">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      const { id: _id, createdAt: _createdAt, ...rest } = ticket;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, accountId: accounts[0]?.id ?? "" });
    }
    setError(null);
  }, [ticket, open, accounts]);

  function patch<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: SavTicket;
      if (ticket) {
        const patchWithResolved =
          form.status === "resolu" && !ticket.resolvedAt
            ? { ...form, resolvedAt: new Date().toISOString() }
            : form;
        saved = useDemoData
          ? { ...ticket, ...patchWithResolved }
          : await db.updateSav(ticket.id, patchWithResolved);
      } else {
        saved = useDemoData
          ? { ...form, id: uid("sav"), createdAt: new Date().toISOString() }
          : await db.createSav(form);
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
    if (!ticket) return;
    if (!window.confirm("Supprimer ce ticket SAV ?")) return;
    setSaving(true);
    try {
      if (!useDemoData) await db.deleteSav(ticket.id);
      onDeleted?.(ticket.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de suppression");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ticket ? "Ticket SAV" : "Nouveau ticket SAV"}
      size="md"
      footer={
        <>
          {ticket && onDeleted && (
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
            disabled={saving || !form.accountId || !form.objet}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="Compte"
          required
          value={form.accountId}
          onChange={(e) => patch("accountId", e.target.value)}
        >
          <option value="">— Sélectionner —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.raisonSociale}
            </option>
          ))}
        </Select>
        <Input
          label="Objet"
          required
          value={form.objet}
          onChange={(e) => patch("objet", e.target.value)}
          placeholder="Panne sur centrale, caméra floue…"
        />
        <Textarea
          label="Description"
          rows={4}
          value={form.description}
          onChange={(e) => patch("description", e.target.value)}
          placeholder="Détails du problème signalé par le client"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Priorité"
            value={form.priorite ?? "normale"}
            onChange={(e) => patch("priorite", e.target.value as typeof form.priorite)}
          >
            <option value="basse">Basse</option>
            <option value="normale">Normale</option>
            <option value="haute">Haute</option>
            <option value="urgente">Urgente</option>
          </Select>
          <Select
            label="Statut"
            value={form.status}
            onChange={(e) => patch("status", e.target.value as typeof form.status)}
          >
            <option value="ouvert">Ouvert</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Résolu</option>
          </Select>
        </div>
        {error && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
