import { useEffect, useState } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { uid } from "@/lib/helpers";
import { useDemoData } from "@/lib/supabase";
import * as db from "@/lib/db";
import type { Commercial, Role } from "@/types";

interface Props {
  open: boolean;
  commercial: Commercial | null;
  onClose: () => void;
  onSaved: (c: Commercial) => void;
  onDeleted?: (id: string) => void;
}

const EMPTY: Omit<Commercial, "id"> = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  role: "commercial",
  objectifMensuel: 25000,
  commissionTaux: { achat: 0.08, leasing: 0.05, maintenance: 0.1 },
  couleur: "#60A5FA",
  actif: true,
};

const COULEURS = ["#C9A961", "#60A5FA", "#A78BFA", "#10B981", "#F59E0B", "#EF4444"];

export function CommercialEditor({ open, commercial, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<Omit<Commercial, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (commercial) {
      const { id: _id, ...rest } = commercial;
      setForm(rest);
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [commercial, open]);

  function patch<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function patchCommission(k: keyof typeof form.commissionTaux, v: number) {
    setForm((s) => ({ ...s, commissionTaux: { ...s.commissionTaux, [k]: v } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      let saved: Commercial;
      if (commercial) {
        saved = useDemoData
          ? { ...commercial, ...form }
          : await db.updateCommercial(commercial.id, form);
      } else {
        saved = useDemoData ? { ...form, id: uid("c") } : await db.createCommercial(form);
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
    if (!commercial) return;
    if (!window.confirm(`Supprimer ${commercial.prenom} ${commercial.nom} ?`)) return;
    setSaving(true);
    try {
      if (!useDemoData) await db.deleteCommercial(commercial.id);
      onDeleted?.(commercial.id);
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
      title={commercial ? "Modifier le commercial" : "Nouveau commercial"}
      size="lg"
      footer={
        <>
          {commercial && onDeleted && (
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
            disabled={saving || !form.prenom || !form.nom || !form.email}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => patch("email", e.target.value)}
          />
          <Input
            label="Téléphone"
            value={form.telephone}
            onChange={(e) => patch("telephone", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label="Rôle"
            value={form.role}
            onChange={(e) => patch("role", e.target.value as Role)}
          >
            <option value="dirigeant">Dirigeant</option>
            <option value="commercial">Commercial</option>
            <option value="technicien">Technicien</option>
          </Select>
          {/* Les techniciens n'ont pas d'objectif de signature */}
          {form.role !== "technicien" && (
            <Input
              label="Objectif mensuel HT (€)"
              type="number"
              min={0}
              value={form.objectifMensuel}
              onChange={(e) => patch("objectifMensuel", Number(e.target.value))}
            />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            Couleur d'identification
          </label>
          <div className="flex gap-2 flex-wrap">
            {COULEURS.map((c) => (
              <button
                key={c}
                onClick={() => patch("couleur", c)}
                className={`w-8 h-8 rounded-lg transition-transform ${form.couleur === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""}`}
                style={{ background: c }}
                aria-label={`Couleur ${c}`}
              />
            ))}
            <input
              type="color"
              value={form.couleur}
              onChange={(e) => patch("couleur", e.target.value)}
              className="w-8 h-8 rounded-lg border-0 cursor-pointer"
            />
          </div>
        </div>
        {/* Les techniciens n'ont pas de commissions sur le CA */}
        {form.role !== "technicien" && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Commissions (% du CA)
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Achat %"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={+(form.commissionTaux.achat * 100).toFixed(1)}
                onChange={(e) => patchCommission("achat", Number(e.target.value) / 100)}
              />
              <Input
                label="Leasing %"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={+(form.commissionTaux.leasing * 100).toFixed(1)}
                onChange={(e) => patchCommission("leasing", Number(e.target.value) / 100)}
              />
              <Input
                label="Maintenance %"
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={+(form.commissionTaux.maintenance * 100).toFixed(1)}
                onChange={(e) => patchCommission("maintenance", Number(e.target.value) / 100)}
              />
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.actif ?? true}
            onChange={(e) => patch("actif", e.target.checked)}
            className="accent-[#C9A961]"
          />
          Commercial actif
        </label>
        {error && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
