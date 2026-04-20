import { useEffect, useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { NIVEAUX_MAINTENANCE } from "@/lib/constants";
import { uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { Contrat, Account, ContratStatut, NiveauMaintenance } from "@/types";

interface Props {
  open: boolean;
  contract: Contrat | null;
  accounts: Account[];
  defaultAccountId?: string;
  onClose: () => void;
  onSaved: (c: Contrat) => void;
  onDeleted?: (id: string) => void;
}

const EMPTY: Omit<Contrat, "id"> = {
  numero: undefined,
  accountId: "",
  niveau: "confort",
  montantAnnuel: 0,
  dateDebut: new Date().toISOString().slice(0, 10),
  dateFin: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
  statut: "actif",
};

export function ContractEditor({
  open,
  contract,
  accounts,
  defaultAccountId,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [form, setForm] = useState<Omit<Contrat, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contract) {
      const { id: _id, ...rest } = contract;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, accountId: defaultAccountId ?? accounts[0]?.id ?? "" });
    }
    setError(null);
  }, [contract, open, defaultAccountId, accounts]);

  function patch<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: Contrat;
      if (contract) {
        saved = useDemoData ? { ...contract, ...form } : await db.updateContract(contract.id, form);
      } else {
        saved = useDemoData ? { ...form, id: uid("mc") } : await db.createContract(form);
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
    if (!contract) return;
    if (!window.confirm("Supprimer ce contrat ?")) return;
    setSaving(true);
    try {
      if (!useDemoData) await db.deleteContract(contract.id);
      onDeleted?.(contract.id);
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
      title={contract ? "Modifier le contrat" : "Nouveau contrat de maintenance"}
      size="md"
      footer={
        <>
          {contract && onDeleted && (
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
            disabled={saving || !form.accountId || form.montantAnnuel <= 0}
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
        <Select
          label="Niveau de maintenance"
          value={form.niveau}
          onChange={(e) => patch("niveau", e.target.value as NiveauMaintenance)}
        >
          {Object.values(NIVEAUX_MAINTENANCE).map((n) => (
            <option key={n.id} value={n.id}>
              {n.label} ({Math.round(n.prixAnnuelRatio * 100)} %)
            </option>
          ))}
        </Select>
        <Input
          label="Montant annuel HT (€)"
          type="number"
          min={0}
          step="0.01"
          value={form.montantAnnuel}
          onChange={(e) => patch("montantAnnuel", Number(e.target.value))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date de début"
            type="date"
            value={form.dateDebut}
            onChange={(e) => patch("dateDebut", e.target.value)}
          />
          <Input
            label="Date de fin"
            type="date"
            value={form.dateFin}
            onChange={(e) => patch("dateFin", e.target.value)}
          />
        </div>
        <Select
          label="Statut"
          value={form.statut}
          onChange={(e) => patch("statut", e.target.value as ContratStatut)}
        >
          <option value="actif">Actif</option>
          <option value="a_renouveler">À renouveler</option>
          <option value="expire">Expiré</option>
          <option value="suspendu">Suspendu</option>
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
