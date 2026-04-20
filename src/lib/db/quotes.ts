import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import type { Quote, QuoteLine } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromLineRow = (r: any): QuoteLine => ({
  id: r.id,
  productId: r.product_id ?? undefined,
  libelle: r.libelle,
  quantite: Number(r.quantite),
  prixAchatHT: Number(r.prix_achat_ht),
  prixVenteHT: Number(r.prix_vente_ht),
});

const toLineRow = (l: QuoteLine, quoteId: string, ordre: number): Record<string, unknown> => ({
  quote_id: quoteId,
  product_id: l.productId ?? null,
  libelle: l.libelle,
  quantite: l.quantite,
  prix_achat_ht: l.prixAchatHT,
  prix_vente_ht: l.prixVenteHT,
  ordre,
});

const fromRow = (r: any): Quote => ({
  id: r.id,
  numero: r.numero,
  dealId: r.deal_id ?? null,
  accountId: r.account_id,
  contactId: r.contact_id ?? undefined,
  commercialId: r.commercial_id,
  lignes: Array.isArray(r.quote_lines)
    ? [...r.quote_lines]
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
        .map(fromLineRow)
    : [],
  heuresMO: Number(r.heures_mo),
  tauxMO: Number(r.taux_mo),
  fraisDeplacement: Number(r.frais_deplacement),
  modeAchat: { maintenance: r.niveau_maintenance },
  modeLeasing: { duree: Number(r.duree_leasing) as 36 | 48 | 60 },
  mensualiteLeasingOverride:
    r.mensualite_leasing_override !== null && r.mensualite_leasing_override !== undefined
      ? Number(r.mensualite_leasing_override)
      : null,
  status: r.status,
  formuleChoisie: r.formule_choisie ?? null,
  typeSite: r.type_site ?? undefined,
  surface: r.surface !== null && r.surface !== undefined ? Number(r.surface) : undefined,
  nbOuvrants: r.nb_ouvrants ?? undefined,
  contraintes: r.contraintes ?? undefined,
  createdAt: r.created_at,
  sentAt: r.sent_at ?? undefined,
  signedAt: r.signed_at ?? undefined,
});

const toRow = (q: Partial<Quote>): Record<string, unknown> => {
  const row: Record<string, unknown> = {
    numero: q.numero,
    deal_id: q.dealId ?? null,
    account_id: q.accountId,
    contact_id: q.contactId ?? null,
    commercial_id: q.commercialId,
    heures_mo: q.heuresMO,
    taux_mo: q.tauxMO,
    frais_deplacement: q.fraisDeplacement,
    status: q.status,
    formule_choisie: q.formuleChoisie ?? null,
    type_site: q.typeSite ?? null,
    surface: q.surface ?? null,
    nb_ouvrants: q.nbOuvrants ?? null,
    contraintes: q.contraintes ?? null,
    sent_at: q.sentAt ?? null,
    signed_at: q.signedAt ?? null,
  };
  if (q.modeAchat) row.niveau_maintenance = q.modeAchat.maintenance;
  if (q.modeLeasing) row.duree_leasing = q.modeLeasing.duree;
  if (q.mensualiteLeasingOverride !== undefined)
    row.mensualite_leasing_override = q.mensualiteLeasingOverride;
  return row;
};

export async function listQuotes(): Promise<Quote[]> {
  if (useDemoData || !supabase) return DEMO_STATE.quotes;
  const { data, error } = await supabase
    .from("quotes")
    .select("*, quote_lines(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

// Cree un devis + ses lignes en une operation (les lignes inserees apres le devis
// pour avoir le quote_id, puis rechargement du devis avec ses lignes).
export async function createQuote(q: Omit<Quote, "id" | "createdAt">): Promise<Quote> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { data: quote, error } = await supabase
    .from("quotes")
    .insert(toRow(q))
    .select()
    .single();
  if (error) throw error;

  if (q.lignes && q.lignes.length > 0) {
    const rows = q.lignes.map((l, i) => toLineRow(l, quote.id, i));
    const { error: errLines } = await supabase.from("quote_lines").insert(rows);
    if (errLines) throw errLines;
  }

  const { data: full, error: errFull } = await supabase
    .from("quotes")
    .select("*, quote_lines(*)")
    .eq("id", quote.id)
    .single();
  if (errFull) throw errFull;
  return fromRow(full);
}

// Update : met a jour le devis, puis remplace les lignes (delete + insert).
// Approche pragmatique : les lignes sont versionnees en bloc avec le devis.
export async function updateQuote(id: string, patch: Partial<Quote>): Promise<Quote> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  const { error } = await supabase.from("quotes").update(toRow(patch)).eq("id", id);
  if (error) throw error;

  if (patch.lignes) {
    const { error: errDel } = await supabase.from("quote_lines").delete().eq("quote_id", id);
    if (errDel) throw errDel;
    if (patch.lignes.length > 0) {
      const rows = patch.lignes.map((l, i) => toLineRow(l, id, i));
      const { error: errIns } = await supabase.from("quote_lines").insert(rows);
      if (errIns) throw errIns;
    }
  }

  const { data: full, error: errFull } = await supabase
    .from("quotes")
    .select("*, quote_lines(*)")
    .eq("id", id)
    .single();
  if (errFull) throw errFull;
  return fromRow(full);
}

export async function deleteQuote(id: string): Promise<void> {
  if (useDemoData || !supabase) throw new Error("Mode demo");
  // quote_lines cascade via FK
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}

// Genere un numero de devis DEV-YYYY-NNNN base sur le dernier sequence.
export async function nextQuoteNumero(): Promise<string> {
  const year = new Date().getFullYear();
  if (useDemoData || !supabase) {
    const n = DEMO_STATE.quotes.length + 1;
    return `DEV-${year}-${String(n).padStart(4, "0")}`;
  }
  const { data, error } = await supabase
    .from("quotes")
    .select("numero")
    .like("numero", `DEV-${year}-%`)
    .order("numero", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.numero;
  const nextN = last ? Number(last.split("-")[2]) + 1 : 1;
  return `DEV-${year}-${String(nextN).padStart(4, "0")}`;
}
