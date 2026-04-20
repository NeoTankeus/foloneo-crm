// ============================================================================
// HELPERS UTILITAIRES
// ============================================================================

export const cx = (...args: (string | false | null | undefined)[]): string =>
  args.filter(Boolean).join(" ");

export const uid = (prefix = "id"): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

// ============================================================================
// FORMATAGE
// ============================================================================
const eur0 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const num0 = new Intl.NumberFormat("fr-FR");

export const fmtEUR = (n: number | null | undefined): string =>
  eur0.format(Math.round(n || 0));

export const fmtEURc = (n: number | null | undefined): string =>
  eur2.format(n || 0);

export const fmtNum = (n: number | null | undefined): string =>
  num0.format(Math.round(n || 0));

export const fmtPct = (n: number | null | undefined): string =>
  `${Math.round((n || 0) * 100)} %`;

export const fmtDate = (d: string | Date | null | undefined): string =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

export const fmtDateShort = (d: string | Date | null | undefined): string =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      })
    : "—";

export const fmtDateTime = (d: string | Date | null | undefined): string =>
  d
    ? new Date(d).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ============================================================================
// DATES
// ============================================================================
export const daysAgo = (d: string | Date): number =>
  Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

export const daysUntil = (d: string | Date): number =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);

export const daysFromNow = (n: number): string =>
  new Date(Date.now() + n * 86_400_000).toISOString();

// ============================================================================
// STRINGS
// ============================================================================
export const initials = (prenom?: string, nom?: string): string =>
  `${(prenom || "").charAt(0)}${(nom || "").charAt(0)}`.toUpperCase();

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ============================================================================
// DOWNLOAD HELPER
// ============================================================================
export const downloadFile = (content: string, filename: string, type = "text/plain"): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
