import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Deal } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Deal => ({
  id: r.id,
  titre: r.titre,
  accountId: r.account_id,
  contactId: r.contact_id ?? undefined,
  commercialId: r.commercial_id ?? undefined,
  etape: r.etape,
  probabilite: Number(r.probabilite),
  valeur: Number(r.valeur),
  formulePreferee: r.formule_preferee,
  dateCible: r.date_cible ?? undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});

const toRow = (d: Partial<Deal>): Record<string, unknown> => ({
  titre: d.titre,
  account_id: d.accountId,
  contact_id: d.contactId ?? null,
  commercial_id: d.commercialId ?? null,
  etape: d.etape,
  probabilite: d.probabilite,
  valeur: d.valeur,
  formule_preferee: d.formulePreferee,
  date_cible: d.dateCible ?? null,
  notes: d.notes ?? null,
});

export async function listDeals(): Promise<Deal[]> {
  if (useDemoData || !supabase) return DEMO_STATE.deals;
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

// Si accountId est vide, un compte client minimal est cree automatiquement
// (raison_sociale = "Client à compléter — {titre}") — l'utilisateur complete ensuite.
export async function createDeal(d: Omit<Deal, "id" | "createdAt">): Promise<Deal> {
  if (useDemoData || !supabase) throw new Error("Mode demo");

  let accountId = d.accountId;
  if (!accountId) {
    const label = d.titre ? `Client à compléter — ${d.titre}` : "Client à compléter";
    const { data: acc, error: errAcc } = await supabase
      .from("accounts")
      .insert({ raison_sociale: label })
      .select("id")
      .single();
    if (errAcc) throw errAcc;
    accountId = acc.id;
  }

  const { data, error } = await supabase
    .from("deals")
    .insert({ ...toRow(d), account_id: accountId })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateDeal(id: string, patch: Partial<Deal>): Promise<Deal> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("deals")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteDeal(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) throw error;
}
