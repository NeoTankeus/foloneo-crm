import { useEffect, useState } from "react";
import { Save, Trash2, AlertTriangle, UserPlus, Link as LinkIcon } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { cx, uid } from "@/lib/helpers";
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

type FormState = Omit<SavTicket, "id" | "createdAt">;

const EMPTY: FormState = {
  numero: undefined,
  accountId: undefined,
  clientNom: "",
  clientTelephone: "",
  clientEmail: "",
  objet: "",
  description: "",
  status: "ouvert",
  priorite: "normale",
};

// Mode du ticket : rattache a un compte existant, ou client ad-hoc (saisie libre).
type ClientMode = "account" | "adhoc";

export function SavEditor({ open, ticket, accounts, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [mode, setMode] = useState<ClientMode>("adhoc");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticket) {
      const { id: _id, createdAt: _createdAt, ...rest } = ticket;
      setForm({
        ...EMPTY,
        ...rest,
      });
      // Detection du mode : si accountId -> compte, sinon ad-hoc
      setMode(ticket.accountId ? "account" : "adhoc");
    } else {
      // Par defaut : ad-hoc (reponds au besoin "sans client enregistré")
      setForm({ ...EMPTY });
      setMode("adhoc");
    }
    setError(null);
  }, [ticket, open]);

  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // Validation coherente avec la contrainte DB (account OR client_nom)
  const canSave = (() => {
    if (!form.objet.trim()) return false;
    if (mode === "account") return !!form.accountId;
    return !!(form.clientNom ?? "").trim();
  })();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      // Selon le mode, on transmet l'un OU l'autre (pas les deux)
      const payload: FormState =
        mode === "account"
          ? {
              ...form,
              clientNom: undefined,
              clientTelephone: undefined,
              clientEmail: undefined,
            }
          : {
              ...form,
              accountId: undefined,
            };

      let saved: SavTicket;
      if (ticket) {
        const patchWithResolved =
          payload.status === "resolu" && !ticket.resolvedAt
            ? { ...payload, resolvedAt: new Date().toISOString() }
            : payload;
        saved = useDemoData
          ? { ...ticket, ...patchWithResolved }
          : await db.updateSav(ticket.id, patchWithResolved);
      } else {
        saved = useDemoData
          ? { ...payload, id: uid("sav"), createdAt: new Date().toISOString() }
          : await db.createSav(payload);
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
            disabled={saving || !canSave}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Toggle mode : client libre vs compte existant */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setMode("adhoc")}
            className={cx(
              "flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors",
              mode === "adhoc"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500"
            )}
          >
            <UserPlus size={14} />
            Client libre
          </button>
          <button
            type="button"
            onClick={() => setMode("account")}
            disabled={accounts.length === 0}
            className={cx(
              "flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              mode === "account"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-500"
            )}
            title={
              accounts.length === 0
                ? "Aucun compte existant — ajoute un client d'abord"
                : undefined
            }
          >
            <LinkIcon size={14} />
            Compte existant
          </button>
        </div>

        {/* Zone client selon le mode */}
        {mode === "account" ? (
          <Select
            label="Compte rattaché"
            required
            value={form.accountId ?? ""}
            onChange={(e) => patch("accountId", e.target.value || undefined)}
          >
            <option value="">— Sélectionner —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.raisonSociale}
              </option>
            ))}
          </Select>
        ) : (
          <div className="space-y-3 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
            <div className="text-[11px] text-slate-500">
              Saisis directement les coordonnées du client. Tu pourras le rattacher à un compte enregistré plus tard.
            </div>
            <Input
              label="Nom / raison sociale"
              required
              value={form.clientNom ?? ""}
              onChange={(e) => patch("clientNom", e.target.value)}
              placeholder="Ex : M. Dupont, Boulangerie Martin…"
              autoFocus
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Téléphone"
                type="tel"
                value={form.clientTelephone ?? ""}
                onChange={(e) => patch("clientTelephone", e.target.value)}
                placeholder="06 00 00 00 00"
              />
              <Input
                label="Email"
                type="email"
                value={form.clientEmail ?? ""}
                onChange={(e) => patch("clientEmail", e.target.value)}
                placeholder="client@exemple.fr"
              />
            </div>
          </div>
        )}

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
