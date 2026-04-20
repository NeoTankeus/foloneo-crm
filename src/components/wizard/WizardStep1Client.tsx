import { useMemo } from "react";
import { Input, Select, Textarea } from "@/components/ui/primitives";
import type { Quote, AppState } from "@/types";

interface Props {
  draft: Quote;
  setDraft: React.Dispatch<React.SetStateAction<Quote>>;
  state: AppState;
}

export function WizardStep1Client({ draft, setDraft, state }: Props) {
  const contactsForAccount = useMemo(
    () => state.contacts.filter((c) => c.accountId === draft.accountId),
    [state.contacts, draft.accountId]
  );

  function patch<K extends keyof Quote>(k: K, v: Quote[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Client et affaire
        </div>
        <div className="text-xs text-slate-500">
          Sélectionne le compte et le contact concernés par ce devis.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select
          label="Compte"
          required
          value={draft.accountId}
          onChange={(e) => {
            const accountId = e.target.value;
            setDraft((d) => ({ ...d, accountId, contactId: undefined }));
          }}
        >
          <option value="">— Sélectionner —</option>
          {state.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.raisonSociale}
            </option>
          ))}
        </Select>
        <Select
          label="Contact principal"
          value={draft.contactId ?? ""}
          onChange={(e) => patch("contactId", e.target.value || undefined)}
          disabled={!draft.accountId}
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

      <Select
        label="Commercial"
        required
        value={draft.commercialId}
        onChange={(e) => patch("commercialId", e.target.value)}
      >
        <option value="">— Sélectionner —</option>
        {state.commerciaux.map((c) => (
          <option key={c.id} value={c.id}>
            {c.prenom} {c.nom}
          </option>
        ))}
      </Select>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
          Contexte du site
        </div>
        <div className="text-xs text-slate-500 mb-3">
          Informations optionnelles pour affiner le cadrage technique.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          label="Type de site"
          placeholder="commerce, résidentiel, industriel…"
          value={draft.typeSite ?? ""}
          onChange={(e) => patch("typeSite", e.target.value || undefined)}
        />
        <Input
          label="Surface (m²)"
          type="number"
          min={0}
          value={draft.surface ?? ""}
          onChange={(e) =>
            patch("surface", e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <Input
          label="Nombre d'ouvrants"
          type="number"
          min={0}
          value={draft.nbOuvrants ?? ""}
          onChange={(e) =>
            patch("nbOuvrants", e.target.value ? Number(e.target.value) : undefined)
          }
        />
      </div>

      <Textarea
        label="Contraintes particulières"
        rows={3}
        value={draft.contraintes ?? ""}
        onChange={(e) => patch("contraintes", e.target.value || undefined)}
        placeholder="Accessibilité, câblage, horaires d'intervention…"
      />
    </div>
  );
}
