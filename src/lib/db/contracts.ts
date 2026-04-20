import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Contrat } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Contrat => ({
  id: r.id,
  numero: r.numero ?? undefined,
  accountId: r.account_id,
  niveau: r.niveau,
  montantAnnuel: Number(r.montant_annuel),
  dateDebut: r.date_debut,
  dateFin: r.date_fin,
  statut: r.statut,
});

const toRow = (c: Partial<Contrat>): Record<string, unknown> => ({
  numero: c.numero ?? null,
  account_id: c.accountId,
  niveau: c.niveau,
  montant_annuel: c.montantAnnuel,
  date_debut: c.dateDebut,
  date_fin: c.dateFin,
  statut: c.statut,
});

export async function listContracts(): Promise<Contrat[]> {
  if (useDemoData || !supabase) return DEMO_STATE.contrats;
  const { data, error } = await supabase
    .from("maintenance_contracts")
    .select("*")
    .order("date_fin");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createContract(c: Omit<Contrat, "id">): Promise<Contrat> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("maintenance_contracts")
    .insert(toRow(c))
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateContract(id: string, patch: Partial<Contrat>): Promise<Contrat> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("maintenance_contracts")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteContract(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("maintenance_contracts").delete().eq("id", id);
  if (error) throw error;
}
