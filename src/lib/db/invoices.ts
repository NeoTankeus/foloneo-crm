import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Invoice, QuoteLine } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromRow = (r: any): Invoice => ({
  id: r.id,
  numero: r.numero,
  quoteId: r.quote_id ?? null,
  accountId: r.account_id,
  commercialId: r.commercial_id ?? undefined,
  montantHT: Number(r.montant_ht),
  montantTVA: Number(r.montant_tva),
  montantTTC: Number(r.montant_ttc),
  status: r.status,
  type: r.type,
  dateEmission: r.date_emission,
  dateEcheance: r.date_echeance,
  datePaiement: r.date_paiement ?? undefined,
  lignes: Array.isArray(r.lignes) ? (r.lignes as QuoteLine[]) : [],
});

const toRow = (f: Partial<Invoice>): Record<string, unknown> => ({
  numero: f.numero,
  quote_id: f.quoteId ?? null,
  account_id: f.accountId,
  commercial_id: f.commercialId ?? null,
  montant_ht: f.montantHT,
  montant_tva: f.montantTVA,
  montant_ttc: f.montantTTC,
  status: f.status,
  type: f.type,
  date_emission: f.dateEmission,
  date_echeance: f.dateEcheance,
  date_paiement: f.datePaiement ?? null,
  lignes: f.lignes ?? [],
});

export async function listInvoices(): Promise<Invoice[]> {
  if (useDemoData || !supabase) return DEMO_STATE.invoices;
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("date_emission", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function createInvoice(f: Omit<Invoice, "id">): Promise<Invoice> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase.from("invoices").insert(toRow(f)).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<Invoice> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data, error } = await supabase
    .from("invoices")
    .update(toRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteInvoice(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

export async function nextInvoiceNumero(): Promise<string> {
  const year = new Date().getFullYear();
  if (useDemoData || !supabase) {
    const n = DEMO_STATE.invoices.length + 1;
    return `FA-${year}-${String(n).padStart(4, "0")}`;
  }
  const { data, error } = await supabase
    .from("invoices")
    .select("numero")
    .like("numero", `FA-${year}-%`)
    .order("numero", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.numero;
  const nextN = last ? Number(last.split("-")[2]) + 1 : 1;
  return `FA-${year}-${String(nextN).padStart(4, "0")}`;
}
