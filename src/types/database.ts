// ============================================================================
// TYPES SUPABASE — à régénérer avec `npx supabase gen types typescript --local`
// après application des migrations
// ============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      accounts: { Row: any; Insert: any; Update: any };
      contacts: { Row: any; Insert: any; Update: any };
      products: { Row: any; Insert: any; Update: any };
      packs: { Row: any; Insert: any; Update: any };
      deals: { Row: any; Insert: any; Update: any };
      quotes: { Row: any; Insert: any; Update: any };
      quote_lines: { Row: any; Insert: any; Update: any };
      invoices: { Row: any; Insert: any; Update: any };
      maintenance_contracts: { Row: any; Insert: any; Update: any };
      commerciaux: { Row: any; Insert: any; Update: any };
      events: { Row: any; Insert: any; Update: any };
      sav_tickets: { Row: any; Insert: any; Update: any };
      interactions: { Row: any; Insert: any; Update: any };
      settings: { Row: any; Insert: any; Update: any };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
