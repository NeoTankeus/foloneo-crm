import { useMemo, useState } from "react";
import { Plus, Search, Mail, Phone, Users } from "lucide-react";
import { Card, Input, Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/overlays";
import { ContactEditor } from "@/components/modals/ContactEditor";
import { initials, upsertById, removeById } from "@/lib/helpers";
import type { AppState, Contact } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const ROLE_LABELS: Record<Contact["role"], string> = {
  decideur: "Décideur",
  technique: "Technique",
  compta: "Compta",
  autre: "Autre",
};

export function ContactsView({ state, setState }: Props) {
  const [editor, setEditor] = useState<{ open: boolean; contact: Contact | null }>({
    open: false,
    contact: null,
  });
  const [search, setSearch] = useState<string>("");
  const [role, setRole] = useState<Contact["role"] | "all">("all");
  const [accountId, setAccountId] = useState<string | "all">("all");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return state.contacts.filter((c) => {
      if (role !== "all" && c.role !== role) return false;
      if (accountId !== "all" && c.accountId !== accountId) return false;
      if (s) {
        const hay =
          `${c.prenom} ${c.nom} ${c.fonction ?? ""} ${c.email ?? ""} ${c.telephone ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [state.contacts, search, role, accountId]);

  const accountName = (id: string) =>
    state.accounts.find((a) => a.id === id)?.raisonSociale ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, fonction, email)…"
            className="pl-9"
          />
        </div>
        <Select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="sm:max-w-[200px]"
        >
          <option value="all">Tous comptes</option>
          {state.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.raisonSociale}
            </option>
          ))}
        </Select>
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as Contact["role"] | "all")}
          className="sm:max-w-[160px]"
        >
          <option value="all">Tous rôles</option>
          <option value="decideur">Décideur</option>
          <option value="technique">Technique</option>
          <option value="compta">Compta</option>
          <option value="autre">Autre</option>
        </Select>
        <Button
          variant="gold"
          icon={Plus}
          onClick={() => setEditor({ open: true, contact: null })}
          disabled={state.accounts.length === 0}
        >
          Nouveau
        </Button>
      </div>

      <div className="text-xs text-slate-500">
        {filtered.length} contact{filtered.length > 1 ? "s" : ""}
        {filtered.length !== state.contacts.length && ` / ${state.contacts.length}`}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Users}
            title="Aucun contact"
            description={
              state.accounts.length === 0
                ? "Crée d'abord un compte avant d'ajouter des contacts."
                : "Aucun contact avec ces filtres."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Card
              key={c.id}
              hover
              onClick={() => setEditor({ open: true, contact: c })}
              className="p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0B1E3F] text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                  {initials(c.prenom, c.nom)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {c.prenom} {c.nom}
                  </div>
                  {c.fonction && (
                    <div className="text-xs text-slate-500 truncate">{c.fonction}</div>
                  )}
                  <div className="text-xs text-[#8B7228] dark:text-[#C9A961] font-medium mt-0.5 truncate">
                    {accountName(c.accountId)}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {c.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={11} className="flex-shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.telephone && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone size={11} className="flex-shrink-0" />
                        <span className="truncate">{c.telephone}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <Badge tone={c.role === "decideur" ? "gold" : "slate"}>
                      {ROLE_LABELS[c.role]}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ContactEditor
        open={editor.open}
        contact={editor.contact}
        accounts={state.accounts}
        onClose={() => setEditor({ open: false, contact: null })}
        onSaved={(c) =>
          setState((s) => ({ ...s, contacts: upsertById(s.contacts, c) }))
        }
        onDeleted={(id) =>
          setState((s) => ({ ...s, contacts: removeById(s.contacts, id) }))
        }
      />
    </div>
  );
}
