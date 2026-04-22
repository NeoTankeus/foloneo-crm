import { useEffect, useMemo, useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ETAPES } from "@/lib/constants";
import { uid } from "@/lib/helpers";
import { celebrate } from "@/lib/celebrate";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { Deal, Account, Contact, Commercial } from "@/types";

interface Props {
  open: boolean;
  deal: Deal | null;
  defaultAccountId?: string;
  accounts: Account[];
  contacts: Contact[];
  commerciaux: Commercial[];
  onClose: () => void;
  onSaved: (d: Deal) => void;
  onDeleted?: (id: string) => void;
  // Appele si un compte a ete cree automatiquement lors de la sauvegarde
  // (Option B : pipeline sans compte -> compte auto-cree cote DB).
  onAccountsRefreshed?: (accounts: Account[]) => void;
}

const EMPTY: Omit<Deal, "id" | "createdAt"> = {
  titre: "",
  accountId: "",
  contactId: undefined,
  commercialId: undefined,
  etape: "prospection",
  probabilite: 10,
  valeur: 0,
  formulePreferee: "achat_maintenance",
  dateCible: undefined,
  notes: "",
};

export function DealEditor({
  open,
  deal,
  defaultAccountId,
  accounts,
  contacts,
  commerciaux,
  onClose,
  onSaved,
  onDeleted,
  onAccountsRefreshed,
}: Props) {
  const [form, setForm] = useState<Omit<Deal, "id" | "createdAt">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-initialisation UNIQUEMENT quand la modale s'ouvre ou change de cible.
  // accounts/defaultAccountId dans les deps causaient un reset du formulaire a
  // chaque changement d'etat (import, refresh), ce qui effacait la saisie en cours.
  useEffect(() => {
    if (deal) {
      const { id: _id, createdAt: _createdAt, ...rest } = deal;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, accountId: defaultAccountId ?? "" });
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal, open]);

  const contactsForAccount = useMemo(
    () => contacts.filter((c) => c.accountId === form.accountId),
    [contacts, form.accountId]
  );

  function patch<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // Auto-probabilite selon l'etape
  function setEtape(etape: typeof form.etape) {
    const conf = ETAPES.find((e) => e.id === etape);
    setForm((s) => ({ ...s, etape, probabilite: conf?.proba ?? s.probabilite }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: Deal;
      const autoCreateAccount = !deal && !form.accountId;
      const justSigned = form.etape === "signe" && (!deal || deal.etape !== "signe");
      if (deal) {
        saved = useDemoData ? { ...deal, ...form } : await db.updateDeal(deal.id, form);
      } else {
        saved = useDemoData
          ? { ...form, id: uid("deal"), createdAt: new Date().toISOString() }
          : await db.createDeal(form);
      }
      if (justSigned) celebrate("signature");
      onSaved(saved);
      // Si un compte a ete auto-cree cote DB, on propose au parent de rafraichir sa liste.
      if (autoCreateAccount && !useDemoData && onAccountsRefreshed) {
        try {
          const fresh = await db.listAccounts();
          onAccountsRefreshed(fresh);
        } catch {
          /* refresh best-effort */
        }
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deal) return;
    if (!window.confirm(`Supprimer l'affaire "${deal.titre}" ?`)) return;
    setSaving(true);
    setError(null);
    try {
      if (!useDemoData) await db.deleteDeal(deal.id);
      onDeleted?.(deal.id);
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
      title={deal ? "Modifier l'affaire" : "Nouvelle affaire"}
      size="lg"
      footer={
        <>
          {deal && onDeleted && (
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
            disabled={saving || !form.titre}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Titre de l'affaire"
          required
          value={form.titre}
          onChange={(e) => patch("titre", e.target.value)}
          placeholder="Ex : Équipement boutique principale"
          autoFocus
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Compte"
            value={form.accountId}
            onChange={(e) => patch("accountId", e.target.value)}
          >
            <option value="">— Créer automatiquement —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.raisonSociale}
              </option>
            ))}
          </Select>
          <Select
            label="Contact principal"
            value={form.contactId ?? ""}
            onChange={(e) => patch("contactId", e.target.value || undefined)}
          >
            <option value="">—</option>
            {contactsForAccount.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prenom} {c.nom}
                {c.fonction ? ` (${c.fonction})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Commercial"
            value={form.commercialId ?? ""}
            onChange={(e) => patch("commercialId", e.target.value || undefined)}
          >
            <option value="">—</option>
            {commerciaux.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prenom} {c.nom}
              </option>
            ))}
          </Select>
          <Select
            label="Formule préférée"
            value={form.formulePreferee}
            onChange={(e) => patch("formulePreferee", e.target.value as typeof form.formulePreferee)}
          >
            <option value="achat">Achat sec</option>
            <option value="achat_maintenance">Achat + Maintenance</option>
            <option value="leasing">Leasing</option>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="Étape"
            value={form.etape}
            onChange={(e) => setEtape(e.target.value as typeof form.etape)}
          >
            {ETAPES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </Select>
          <Input
            label="Probabilité %"
            type="number"
            min={0}
            max={100}
            value={form.probabilite}
            onChange={(e) => patch("probabilite", Number(e.target.value))}
          />
          <Input
            label="Valeur HT €"
            type="number"
            min={0}
            value={form.valeur}
            onChange={(e) => patch("valeur", Number(e.target.value))}
          />
        </div>
        <Input
          label="Date cible"
          type="date"
          value={form.dateCible ?? ""}
          onChange={(e) => patch("dateCible", e.target.value || undefined)}
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
