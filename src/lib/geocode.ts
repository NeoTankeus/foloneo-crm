// Geocodage via Nominatim (OpenStreetMap). Gratuit, sans cle, mais avec une
// limite stricte de 1 requete/seconde (politique d'usage du service public).
//
// Usage :
//   const pos = await geocodeAddress({ adresse, codePostal, ville });
//   // -> { lat, lng } | null

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_DELAY_MS = 1100; // marge au-dessus de la limite 1 req/s

let lastCallAt = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, MIN_DELAY_MS - (now - lastCallAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

export interface GeocodeInput {
  adresse?: string;
  codePostal?: string;
  ville?: string;
  raisonSociale?: string;
  pays?: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Construit une chaine d'adresse optimisee pour Nominatim et retourne
 * les coordonnees si trouvees, sinon null.
 */
export async function geocodeAddress(input: GeocodeInput): Promise<GeocodeResult | null> {
  const parts = [
    input.adresse,
    input.codePostal,
    input.ville,
    input.pays ?? "France",
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);

  if (parts.length <= 1) return null; // juste "France" = inutile

  await throttle();
  const q = parts.join(", ");
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=0`;

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim demande un User-Agent descriptif, mais les navigateurs
        // ne laissent pas le modifier. On signale via Accept-Language.
        "Accept-Language": "fr",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data[0]) return null;
    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}
