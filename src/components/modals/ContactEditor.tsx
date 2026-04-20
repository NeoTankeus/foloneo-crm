import { useEffect, useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { Contact, Account } from "@/types";

interface Props {
  open: boolean;
  contact: Contact | null;
  defaultAccountId?: string;
  accounts: Account[];
  onClose: () => void;
  onSaved: (c: Contact) => void;
  onDeleted?: (id: string) => void;
}

const EMPTY: Omit<Contact, "id"> = {
  accountId: "",
  prenom: "",
  nom: "",
  fonction: "",
  email: "",
  telephone: "",
  role: "decideur",
};

export function ContactEditor({
  open,
  contact,
  defaultAccountId,
  accounts,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [form, setForm] = useState<Omit<Contact, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      const { id: _id, ...rest } = contact;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, accountId: defaultAccountId ?? accounts[0]?.id ?? "" });
    }
    setError(null);
  }, [contact, open, defaultAccountId, accounts]);

  function patch<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: Contact;
      if (contact) {
        saved = useDemoData ? { ...contact, ...form } : await db.updateContact(contact.id, form);
      } else {
        saved = useDemoData ? { ...form, id: uid("ct") } : await db.createContact(form);
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
    if (!contact) return;
    if (!window.confirm(`Supprimer le contact ${contact.prenom} ${contact.nom} ?`)) return;
    setSaving(true);
    setError(null);
    try {
      if (!useDemoData) await db.deleteContact(contact.id);
      onDeleted?.(contact.id);
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
      title={contact ? "Modifier le contact" : "Nouveau contact"}
      size="md"
      footer={
        <>
          {contact && onDeleted && (
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
            disabled={saving || !form.prenom || !form.nom || !form.accountId}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Select
          label="Compte"
          value={form.accountId}
          onChange={(e) => patch("accountId", e.target.value)}
          required
        >
          <option value="">— Sélectionner —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.raisonSociale}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prénom"
            required
            value={form.prenom}
            onChange={(e) => patch("prenom", e.target.value)}
          />
          <Input
            label="Nom"
            required
            value={form.nom}
            onChange={(e) => patch("nom", e.target.value)}
          />
        </div>
        <Input
          label="Fonction"
          value={form.fonction ?? ""}
          onChange={(e) => patch("fonction", e.target.value)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => patch("email", e.target.value)}
          />
          <Input
            label="Téléphone"
            value={form.telephone ?? ""}
            onChange={(e) => patch("telephone", e.target.value)}
          />
        </div>
        <Select
          label="Rôle"
          value={form.role}
          onChange={(e) => patch("role", e.target.value as typeof form.role)}
        >
          <option value="decideur">Décideur</option>
          <option value="technique">Technique</option>
          <option value="compta">Compta</option>
          <option value="autre">Autre</option>
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
