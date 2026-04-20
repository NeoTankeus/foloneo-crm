import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Account } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Account => ({
  id: r.id,
  raisonSociale: r.raison_sociale,
  secteur: r.secteur,
  source: r.source,
  adresse: r.adresse ?? "",
  codePostal: r.code_postal ?? "",
  ville: r.ville ?? "",
  telephone: r.telephone ?? undefined,
  email: r.email ?? undefined,
  siret: r.siret ?? undefined,
  latitude: r.latitude !== null && r.latitude !== undefined ? Number(r.latitude) : undefined,
  longitude: r.longitude !== null && r.longitude !== undefined ? Number(r.longitude) : undefined,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});

const toRow = (a: Partial<Account>): Record<string, unknown> => ({
  raison_sociale: a.raisonSociale,
  secteur: a.secteur,
  source: a.source,
  adresse: a.adresse ?? null,
  code_postal: a.codePostal ?? null,
  ville: a.ville ?? null,
  telephone: a.telephone ?? null,
  email: a.email ?? null,
  siret: a.siret ?? null,
  latitude: a.latitude ?? null,
  longitude: a.longitude ?? null,
  notes: a.notes ?? null,
});

export async function listAccounts(): Promise<Account[]> {
  if (useDemoData || !supabase) return DEMO_STATE.accounts;
  const { data, error } = await supabase.from("accounts").select("*").order("raison_sociale");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createAccount(a: Omit<Account, "id" | "createdAt">): Promise<Account> {
  if (useDemoData || !supabase) throw new Error("Mode demo : Supabase n'est pas connecte");
  const { data, error } = await supabase.from("accounts").insert(toRow(a)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateAccount(id: string, patch: Partial<Account>): Promise<Account> {
  if (useDemoData || !supabase) throw new Error("Mode demo : Supabase n'est pas connecte");
  const { data, error } = await supabase
    .from("accounts")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteAccount(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo : Supabase n'est pas connecte");
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}
