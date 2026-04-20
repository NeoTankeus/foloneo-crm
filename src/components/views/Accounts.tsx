import { useMemo, useState } from "react";
import { Plus, Search, MapPin, Mail, Phone, Building2 } from "lucide-react";
import { Card, Input, Select, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/overlays";
import { AccountEditor } from "@/components/modals/AccountEditor";
import { SECTEURS, SOURCES } from "@/lib/constants";
import { upsertById, removeById, cx } from "@/lib/helpers";
import type { AppState, Account, Secteur, Source } from "@/types";

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export function AccountsView({ state, setState }: Props) {
  const [editor, setEditor] = useState<{ open: boolean; account: Account | null }>({
    open: false,
    account: null,
  });
  const [search, setSearch] = useState<string>("");
  const [secteur, setSecteur] = useState<Secteur | "all">("all");
  const [source, setSource] = useState<Source | "all">("all");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return state.accounts.filter((a) => {
      if (secteur !== "all" && a.secteur !== secteur) return false;
      if (source !== "all" && a.source !== source) return false;
      if (s) {
        const hay =
          `${a.raisonSociale} ${a.ville ?? ""} ${a.email ?? ""} ${a.telephone ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [state.accounts, search, secteur, source]);

  const countByAccount = useMemo(() => {
    const m: Record<string, { contacts: number; deals: number }> = {};
    state.accounts.forEach((a) => {
      m[a.id] = { contacts: 0, deals: 0 };
    });
    state.contacts.forEach((c) => {
      if (m[c.accountId]) m[c.accountId].contacts++;
    });
    state.deals.forEach((d) => {
      if (m[d.accountId]) m[d.accountId].deals++;
    });
    return m;
  }, [state.accounts, state.contacts, state.deals]);

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
            placeholder="Rechercher (nom, ville, email, tel)…"
            className="pl-9"
          />
        </div>
        <Select
          value={secteur}
          onChange={(e) => setSecteur(e.target.value as Secteur | "all")}
          className="sm:max-w-[180px]"
        >
          <option value="all">Tous secteurs</option>
          {SECTEURS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          value={source}
          onChange={(e) => setSource(e.target.value as Source | "all")}
          className="sm:max-w-[180px]"
        >
          <option value="all">Toutes sources</option>
          {SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
        <Button
          variant="gold"
          icon={Plus}
          onClick={() => setEditor({ open: true, account: null })}
        >
          Nouveau
        </Button>
      </div>

      <div className="text-xs text-slate-500">
        {filtered.length} compte{filtered.length > 1 ? "s" : ""}
        {filtered.length !== state.accounts.length && ` / ${state.accounts.length}`}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Building2}
            title="Aucun compte"
            description={search || secteur !== "all" || source !== "all" ? "Aucun résultat avec ces filtres." : "Ajoute ton premier client pour démarrer."}
            action={
              <Button
                variant="primary"
                icon={Plus}
                size="sm"
                onClick={() => setEditor({ open: true, account: null })}
              >
                Créer un compte
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => {
            const secteurConf = SECTEURS.find((s) => s.id === a.secteur);
            const Icon = secteurConf?.icon ?? Building2;
            const counts = countByAccount[a.id] ?? { contacts: 0, deals: 0 };
            return (
              <Card
                key={a.id}
                hover
                onClick={() => setEditor({ open: true, account: a })}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F8F0DC] dark:bg-[#C9A961]/20 text-[#8B7228] dark:text-[#C9A961] flex items-center justify-center flex-shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {a.raisonSociale}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {secteurConf?.label ?? a.secteur}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {a.ville && (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin size={11} className="flex-shrink-0" />
                          <span className="truncate">
                            {a.ville} {a.codePostal}
                          </span>
                        </div>
                      )}
                      {a.telephone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone size={11} className="flex-shrink-0" />
                          <span className="truncate">{a.telephone}</span>
                        </div>
                      )}
                      {a.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail size={11} className="flex-shrink-0" />
                          <span className="truncate">{a.email}</span>
                        </div>
                      )}
                    </div>
                    <div className={cx("mt-2 flex gap-1.5 flex-wrap")}>
                      <Badge tone="slate">
                        {counts.contacts} contact{counts.contacts > 1 ? "s" : ""}
                      </Badge>
                      <Badge tone="gold">
                        {counts.deals} affaire{counts.deals > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AccountEditor
        open={editor.open}
        account={editor.account}
        onClose={() => setEditor({ open: false, account: null })}
        onSaved={(a) =>
          setState((s) => ({ ...s, accounts: upsertById(s.accounts, a) }))
        }
        onDeleted={(id) =>
          setState((s) => ({ ...s, accounts: removeById(s.accounts, id) }))
        }
      />
    </div>
  );
}
