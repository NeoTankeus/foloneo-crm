import { useEffect, useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { Invoice, Account, Commercial, InvoiceStatus, InvoiceType } from "@/types";

interface Props {
  open: boolean;
  invoice: Invoice | null;
  accounts: Account[];
  commerciaux: Commercial[];
  tva: number;
  onClose: () => void;
  onSaved: (f: Invoice) => void;
  onDeleted?: (id: string) => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const EMPTY: Omit<Invoice, "id"> = {
  numero: "",
  quoteId: null,
  accountId: "",
  commercialId: undefined,
  montantHT: 0,
  montantTVA: 0,
  montantTTC: 0,
  status: "brouillon",
  type: "ponctuelle",
  dateEmission: todayISO(),
  dateEcheance: plusDays(30),
  datePaiement: undefined,
  lignes: [],
};

export function InvoiceEditor({
  open,
  invoice,
  accounts,
  commerciaux,
  tva,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [form, setForm] = useState<Omit<Invoice, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      const { id: _id, ...rest } = invoice;
      setForm(rest);
    } else {
      // Init numero via DB si dispo
      (async () => {
        let numero = `FA-${new Date().getFullYear()}-NEW`;
        try {
          numero = await db.nextInvoiceNumero();
        } catch {
          /* fallback */
        }
        setForm({ ...EMPTY, numero });
      })();
    }
    setError(null);
  }, [invoice, open]);

  function patch<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // Auto-calc TVA et TTC depuis HT
  function setMontantHT(ht: number) {
    const montantTVA = +(ht * tva).toFixed(2);
    const montantTTC = +(ht + montantTVA).toFixed(2);
    setForm((s) => ({ ...s, montantHT: ht, montantTVA, montantTTC }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: Invoice;
      if (invoice) {
        saved = useDemoData ? { ...invoice, ...form } : await db.updateInvoice(invoice.id, form);
      } else {
        saved = useDemoData ? { ...form, id: uid("inv") } : await db.createInvoice(form);
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
    if (!invoice) return;
    if (!window.confirm(`Supprimer la facture ${invoice.numero} ?`)) return;
    setSaving(true);
    try {
      if (!useDemoData) await db.deleteInvoice(invoice.id);
      onDeleted?.(invoice.id);
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
      title={invoice ? `Facture ${invoice.numero}` : "Nouvelle facture"}
      size="lg"
      footer={
        <>
          {invoice && onDeleted && (
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
            disabled={saving || !form.accountId || !form.numero}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Numéro"
            required
            value={form.numero}
            onChange={(e) => patch("numero", e.target.value)}
          />
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => patch("type", e.target.value as InvoiceType)}
          >
            <option value="ponctuelle">Ponctuelle</option>
            <option value="recurrente">Récurrente</option>
          </Select>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Montant HT (€)"
            type="number"
            min={0}
            step="0.01"
            value={form.montantHT}
            onChange={(e) => setMontantHT(Number(e.target.value))}
          />
          <Input
            label={`TVA (${Math.round(tva * 100)} %)`}
            type="number"
            min={0}
            step="0.01"
            value={form.montantTVA}
            onChange={(e) => patch("montantTVA", Number(e.target.value))}
          />
          <Input
            label="Montant TTC (€)"
            type="number"
            min={0}
            step="0.01"
            value={form.montantTTC}
            onChange={(e) => patch("montantTTC", Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            label="Date d'émission"
            type="date"
            value={form.dateEmission}
            onChange={(e) => patch("dateEmission", e.target.value)}
          />
          <Input
            label="Date d'échéance"
            type="date"
            value={form.dateEcheance}
            onChange={(e) => patch("dateEcheance", e.target.value)}
          />
          <Input
            label="Date de paiement"
            type="date"
            value={form.datePaiement ?? ""}
            onChange={(e) => patch("datePaiement", e.target.value || undefined)}
          />
        </div>
        <Select
          label="Statut"
          value={form.status}
          onChange={(e) => patch("status", e.target.value as InvoiceStatus)}
        >
          <option value="brouillon">Brouillon</option>
          <option value="emise">Émise</option>
          <option value="payee">Payée</option>
          <option value="retard">En retard</option>
          <option value="litige">Litige</option>
        </Select>
        {error && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
