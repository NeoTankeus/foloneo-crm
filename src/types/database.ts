// ============================================================================
// TYPES SUPABASE — stub permissif.
// A regenerer avec `npx supabase gen types typescript --local` apres
// application des migrations pour avoir du typage fort sur chaque table.
// En attendant, on expose des tables "Record<string, unknown>" plutot que
// des "any" pour eviter que TypeScript les reduise a "never" en mode strict.
// ============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericRow = Record<string, any>;
type GenericTable = {
  Row: GenericRow;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      accounts: GenericTable;
      contacts: GenericTable;
      products: GenericTable;
      packs: GenericTable;
      deals: GenericTable;
      quotes: GenericTable;
      quote_lines: GenericTable;
      invoices: GenericTable;
      maintenance_contracts: GenericTable;
      commerciaux: GenericTable;
      events: GenericTable;
      sav_tickets: GenericTable;
      interactions: GenericTable;
      settings: GenericTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
