import { useEffect, useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { SECTEURS, SOURCES } from "@/lib/constants";
import { uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { Account } from "@/types";

interface Props {
  open: boolean;
  account: Account | null;
  onClose: () => void;
  onSaved: (a: Account) => void;
  onDeleted?: (id: string) => void;
}

const EMPTY: Omit<Account, "id" | "createdAt"> = {
  raisonSociale: "",
  secteur: "tertiaire",
  source: "recommandation",
  adresse: "",
  codePostal: "",
  ville: "",
  telephone: "",
  email: "",
  siret: "",
  notes: "",
};

export function AccountEditor({ open, account, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<Omit<Account, "id" | "createdAt">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      const { id: _id, createdAt: _createdAt, ...rest } = account;
      setForm(rest);
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [account, open]);

  function patch<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: Account;
      if (account) {
        saved = useDemoData ? { ...account, ...form } : await db.updateAccount(account.id, form);
      } else {
        saved = useDemoData
          ? { ...form, id: uid("acc"), createdAt: new Date().toISOString() }
          : await db.createAccount(form);
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
    if (!account) return;
    if (!window.confirm(`Supprimer "${account.raisonSociale}" ? Cette action est irréversible.`))
      return;
    setSaving(true);
    setError(null);
    try {
      if (!useDemoData) await db.deleteAccount(account.id);
      onDeleted?.(account.id);
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
      title={account ? "Modifier le compte" : "Nouveau compte"}
      size="lg"
      footer={
        <>
          {account && onDeleted && (
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
            disabled={saving || !form.raisonSociale}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Raison sociale"
          required
          value={form.raisonSociale}
          onChange={(e) => patch("raisonSociale", e.target.value)}
          autoFocus
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Secteur"
            value={form.secteur}
            onChange={(e) => patch("secteur", e.target.value as typeof form.secteur)}
          >
            {SECTEURS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select
            label="Source"
            value={form.source}
            onChange={(e) => patch("source", e.target.value as typeof form.source)}
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Adresse"
          value={form.adresse ?? ""}
          onChange={(e) => patch("adresse", e.target.value)}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Code postal"
            value={form.codePostal ?? ""}
            onChange={(e) => patch("codePostal", e.target.value)}
          />
          <div className="col-span-2">
            <Input
              label="Ville"
              value={form.ville ?? ""}
              onChange={(e) => patch("ville", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Téléphone"
            value={form.telephone ?? ""}
            onChange={(e) => patch("telephone", e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => patch("email", e.target.value)}
          />
        </div>
        <Input
          label="SIRET"
          value={form.siret ?? ""}
          onChange={(e) => patch("siret", e.target.value)}
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
