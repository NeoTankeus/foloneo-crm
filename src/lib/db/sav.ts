import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { SavTicket } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): SavTicket => ({
  id: r.id,
  numero: r.numero ?? undefined,
  accountId: r.account_id ?? undefined,
  clientNom: r.client_nom ?? undefined,
  clientTelephone: r.client_telephone ?? undefined,
  clientEmail: r.client_email ?? undefined,
  objet: r.objet,
  description: r.description ?? "",
  status: r.status,
  priorite: r.priorite ?? "normale",
  createdAt: r.created_at,
  resolvedAt: r.resolved_at ?? undefined,
});

const toRow = (t: Partial<SavTicket>): Record<string, unknown> => {
  // Chaine vide ou undefined -> null en DB. Si un compte est rattache, les
  // champs ad-hoc sont vides : on ne veut pas de doublon d'info.
  const norm = (v: string | undefined) => {
    const s = (v ?? "").trim();
    return s.length > 0 ? s : null;
  };
  const accountId = norm(t.accountId);
  return {
    numero: t.numero ?? null,
    account_id: accountId,
    client_nom: accountId ? null : norm(t.clientNom),
    client_telephone: accountId ? null : norm(t.clientTelephone),
    client_email: accountId ? null : norm(t.clientEmail),
    objet: t.objet,
    description: norm(t.description),
    status: t.status,
    priorite: t.priorite ?? "normale",
    resolved_at: t.resolvedAt ?? null,
  };
};

export async function listSav(): Promise<SavTicket[]> {
  if (useDemoData || !supabase) return DEMO_STATE.sav;
  const { data, error } = await supabase
    .from("sav_tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createSav(t: Omit<SavTicket, "id" | "createdAt">): Promise<SavTicket> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase.from("sav_tickets").insert(toRow(t)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateSav(id: string, patch: Partial<SavTicket>): Promise<SavTicket> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("sav_tickets")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteSav(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("sav_tickets").delete().eq("id", id);
  if (error) throw error;
}
