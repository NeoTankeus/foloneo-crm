import { useEffect, useRef } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BRAND, NIVEAUX_MAINTENANCE } from "@/lib/constants";
import { fmtEUR, fmtEURc, fmtDate } from "@/lib/helpers";
import { calcDevisTotaux } from "@/lib/calculations";
import type { AppState, Quote, Settings } from "@/types";

interface PrintViewProps {
  open: boolean;
  quote: Quote;
  state: AppState;
  settings: Settings;
  mode: "achat" | "leasing";
  onClose: () => void;
}

// =============================================================================
// PRINT VIEW — regle metier ABSOLUE :
// Mode "leasing" ne contient JAMAIS : prix unitaire, prix total par ligne,
// marque fabricant (Ajax / Dahua / Vauban). Seulement la designation commerciale
// et la quantite, puis la mensualite packagee.
// =============================================================================
export function PrintView({ open, quote, state, settings, mode, onClose }: PrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const totaux = calcDevisTotaux(quote, settings, state.products);
  const account = state.accounts.find((a) => a.id === quote.accountId);
  const contact = quote.contactId
    ? state.contacts.find((c) => c.id === quote.contactId)
    : undefined;
  const commercial = state.commerciaux.find((c) => c.id === quote.commercialId);
  const societe = settings.societe;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-200 dark:bg-slate-950 overflow-y-auto print:bg-white print:overflow-visible">
      {/* Barre d'action (masquee a l'impression) */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center gap-3 print:hidden">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          Devis {quote.numero} ·{" "}
          <span className={mode === "achat" ? "text-[#0B1E3F] dark:text-[#C9A961]" : "text-[#C9A961]"}>
            {mode === "achat" ? "Version Achat" : "Version Leasing — Prestation Globale Évolutive"}
          </span>
        </h2>
        <div className="flex-1" />
        <Button variant="gold" icon={Printer} onClick={handlePrint}>
          Imprimer / PDF
        </Button>
        <Button variant="ghost" icon={X} onClick={onClose}>
          Fermer
        </Button>
      </div>

      {/* Contenu imprimable */}
      <div
        ref={printRef}
        className="print-area max-w-[210mm] mx-auto bg-white text-slate-900 p-8 md:p-10 my-4 md:my-6 shadow-xl print:shadow-none print:my-0 print:p-8"
      >
        {/* En-tete */}
        <header className="flex items-start justify-between gap-6 pb-6 border-b-2 border-[#0B1E3F]">
          <div>
            {/* Logo noir sur fond blanc — le SVG utilise currentColor, on force donc
                la couleur navy via le parent pour rester dans la charte. */}
            <div className="mb-3" style={{ color: BRAND.navy }}>
              <img
                src="/logo-foloneo.svg"
                alt={societe.nom}
                className="h-14 w-auto"
              />
            </div>
            <div className="text-[11px] text-slate-600 space-y-0.5">
              <div>{societe.adresse}</div>
              {societe.telephone && <div>Tél : {societe.telephone}</div>}
              {societe.email && <div>{societe.email}</div>}
              {societe.siret && <div>SIRET : {societe.siret}</div>}
              {societe.ape && <div>APE : {societe.ape}</div>}
            </div>
          </div>
          <div className="text-right">
            <div
              className="inline-block text-xs font-bold px-3 py-1.5 rounded tracking-wide uppercase"
              style={{
                background: mode === "leasing" ? BRAND.gold : BRAND.navy,
                color: mode === "leasing" ? BRAND.navy : "white",
              }}
            >
              {mode === "leasing" ? "Prestation globale évolutive" : "Devis"}
            </div>
            <div className="mt-2 text-lg font-bold" style={{ color: BRAND.navy }}>
              {quote.numero}
            </div>
            <div className="text-xs text-slate-500">émis le {fmtDate(quote.createdAt)}</div>
            {quote.sentAt && (
              <div className="text-xs text-slate-500">envoyé le {fmtDate(quote.sentAt)}</div>
            )}
          </div>
        </header>

        {/* Client + commercial */}
        <section className="grid grid-cols-2 gap-6 my-6 text-sm">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Client
            </div>
            <div className="font-bold text-slate-900">{account?.raisonSociale ?? "—"}</div>
            {contact && (
              <div className="text-slate-700">
                {contact.prenom} {contact.nom}
                {contact.fonction && <span className="text-slate-500"> · {contact.fonction}</span>}
              </div>
            )}
            {account && (
              <div className="text-xs text-slate-600 mt-1">
                {account.adresse}
                <br />
                {account.codePostal} {account.ville}
              </div>
            )}
            {contact?.email && <div className="text-xs text-slate-600">{contact.email}</div>}
            {contact?.telephone && <div className="text-xs text-slate-600">{contact.telephone}</div>}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Votre interlocuteur
            </div>
            {commercial && (
              <>
                <div className="font-bold text-slate-900">
                  {commercial.prenom} {commercial.nom}
                </div>
                <div className="text-xs text-slate-600">{commercial.email}</div>
                {commercial.telephone && (
                  <div className="text-xs text-slate-600">{commercial.telephone}</div>
                )}
              </>
            )}
            {quote.typeSite && (
              <div className="mt-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Site
                </div>
                <div className="text-xs text-slate-700 capitalize">{quote.typeSite}</div>
                {quote.surface && (
                  <div className="text-xs text-slate-600">{quote.surface} m²</div>
                )}
                {quote.nbOuvrants !== undefined && quote.nbOuvrants > 0 && (
                  <div className="text-xs text-slate-600">{quote.nbOuvrants} ouvrants</div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Corps : separation en deux templates */}
        {mode === "achat" ? (
          <AchatBody quote={quote} totaux={totaux} state={state} />
        ) : (
          <LeasingBody quote={quote} totaux={totaux} state={state} />
        )}

        {/* Pied : CGV */}
        <footer className="mt-8 pt-4 border-t border-slate-300 text-[10px] text-slate-500 leading-relaxed">
          {mode === "achat" ? (
            <>
              <div className="font-semibold text-slate-700 mb-1">Conditions générales</div>
              <p>
                Devis valable 30 jours. Acompte 30 % à la commande, solde à la mise en service.
                Matériel garanti 2 ans pièces et main-d'œuvre. Installation conforme aux
                normes NFA2P et EN 50131. TVA applicable au taux en vigueur.
              </p>
            </>
          ) : (
            <>
              <div className="font-semibold text-slate-700 mb-1">
                Conditions de la prestation globale évolutive
              </div>
              <p>
                Prestation de service globale évolutive sur la durée indiquée. Inclut
                l'ensemble du matériel, l'installation, la maintenance préventive et curative,
                le remplacement pièces selon conditions, ainsi que les évolutions matérielles
                (provision). Mensualité fixe, hors TVA. Engagement de durée, renouvellement
                possible en fin de période avec matériel dernière génération.
              </p>
            </>
          )}
          <div className="mt-3 text-center text-[9px]">
            {societe.nom} · {societe.adresse} · {societe.email} · SAV : {societe.sav}
          </div>
        </footer>
      </div>
    </div>
  );
}

// =============================================================================
// CORPS MODE ACHAT — detail complet avec PU HT et totaux par ligne.
// Le libelle est force sur libelleCommercial quand un produit est lie, pour
// eviter les fuites de marques dans les PDF client-facing.
// =============================================================================
function AchatBody({
  quote,
  totaux,
  state,
}: {
  quote: Quote;
  totaux: ReturnType<typeof calcDevisTotaux>;
  state: AppState;
}) {
  const niveauConf = NIVEAUX_MAINTENANCE[quote.modeAchat.maintenance];

  return (
    <>
      <section>
        <div
          className="text-[10px] font-bold uppercase tracking-wider mb-2"
          style={{ color: BRAND.navy }}
        >
          Détail de la prestation
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left" style={{ background: "#F3F4F6" }}>
              <th className="p-2.5 font-semibold">Désignation</th>
              <th className="p-2.5 font-semibold w-16 text-right">Qté</th>
              <th className="p-2.5 font-semibold w-24 text-right">PU HT</th>
              <th className="p-2.5 font-semibold w-28 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {quote.lignes.map((l) => {
              const prod = l.productId
                ? state.products.find((p) => p.id === l.productId)
                : undefined;
              const label = prod?.libelleCommercial ?? sanitizeBrand(l.libelle);
              return (
                <tr key={l.id} className="border-b border-slate-200">
                  <td className="p-2.5">{label}</td>
                  <td className="p-2.5 text-right tabular-nums">{l.quantite}</td>
                  <td className="p-2.5 text-right tabular-nums">{fmtEURc(l.prixVenteHT)}</td>
                  <td className="p-2.5 text-right tabular-nums">
                    {fmtEURc(l.prixVenteHT * l.quantite)}
                  </td>
                </tr>
              );
            })}
            {quote.heuresMO > 0 && (
              <tr className="border-b border-slate-200">
                <td className="p-2.5">Main-d'œuvre installation et mise en service</td>
                <td className="p-2.5 text-right tabular-nums">{quote.heuresMO} h</td>
                <td className="p-2.5 text-right tabular-nums">{fmtEURc(quote.tauxMO)}</td>
                <td className="p-2.5 text-right tabular-nums">{fmtEURc(totaux.coutMO)}</td>
              </tr>
            )}
            {quote.fraisDeplacement > 0 && (
              <tr className="border-b border-slate-200">
                <td className="p-2.5">Frais de déplacement</td>
                <td className="p-2.5 text-right tabular-nums">1</td>
                <td className="p-2.5 text-right tabular-nums">{fmtEURc(quote.fraisDeplacement)}</td>
                <td className="p-2.5 text-right tabular-nums">{fmtEURc(totaux.coutDepl)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Totaux */}
      <section className="mt-6 flex justify-end">
        <div className="w-80 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-600">Total HT</span>
            <span className="font-semibold tabular-nums">{fmtEURc(totaux.totalHT)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">TVA 20 %</span>
            <span className="tabular-nums">{fmtEURc(totaux.totalTVA)}</span>
          </div>
          <div
            className="flex justify-between py-2 mt-1 text-base font-bold px-3 rounded"
            style={{ background: BRAND.navy, color: "white" }}
          >
            <span>Total TTC</span>
            <span className="tabular-nums">{fmtEURc(totaux.totalTTC)}</span>
          </div>
        </div>
      </section>

      {/* Option maintenance */}
      <section
        className="mt-6 p-4 rounded-lg border"
        style={{ borderColor: BRAND.gold, background: BRAND.goldLight }}
      >
        <div className="font-bold text-sm mb-1" style={{ color: BRAND.navy }}>
          Option contrat de maintenance — {niveauConf.label}
        </div>
        <div className="text-xs text-slate-700 mb-2">
          Cotisation annuelle : {fmtEUR(totaux.maintenanceAnnuelle)} HT
        </div>
        <ul className="text-[11px] text-slate-700 list-disc pl-4 space-y-0.5">
          {niveauConf.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

// =============================================================================
// CORPS MODE LEASING — AUCUN prix unitaire, AUCUNE marque.
// Force la designation commerciale via productId si dispo, pour eliminer les
// mentions Ajax/Dahua/Vauban qui pourraient trainer dans line.libelle quand
// le devis a ete construit en mode interne.
// =============================================================================
function LeasingBody({
  quote,
  totaux,
  state,
}: {
  quote: Quote;
  totaux: ReturnType<typeof calcDevisTotaux>;
  state: AppState;
}) {
  return (
    <>
      {/* Composition — SANS prix, SANS marque */}
      <section>
        <div
          className="text-[10px] font-bold uppercase tracking-wider mb-2"
          style={{ color: BRAND.navy }}
        >
          Composition de votre solution de sécurité
        </div>
        <div className="text-[11px] text-slate-500 italic mb-2">
          Équipements sélectionnés par nos experts pour répondre à vos besoins.
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left" style={{ background: "#F3F4F6" }}>
              <th className="p-2.5 font-semibold">Désignation</th>
              <th className="p-2.5 font-semibold w-16 text-right">Quantité</th>
            </tr>
          </thead>
          <tbody>
            {quote.lignes.map((l) => {
              const prod = l.productId
                ? state.products.find((p) => p.id === l.productId)
                : undefined;
              const label = prod?.libelleCommercial ?? sanitizeBrand(l.libelle);
              return (
                <tr key={l.id} className="border-b border-slate-200">
                  <td className="p-2.5">{label}</td>
                  <td className="p-2.5 text-right tabular-nums">{l.quantite}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Services inclus */}
      <section className="mt-5">
        <div
          className="text-[10px] font-bold uppercase tracking-wider mb-2"
          style={{ color: BRAND.navy }}
        >
          Prestations incluses pendant toute la durée
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            "Matériel haut de gamme sélectionné",
            "Installation complète et mise en service",
            "Maintenance préventive programmée",
            "Interventions curatives illimitées",
            "Remplacement des pièces défectueuses",
            "Supervision technique à distance",
            "Support téléphonique prioritaire",
            "Évolutions matérielles (provision incluse)",
            "Mises à jour firmware et logicielles",
            "Formation utilisateurs",
          ].map((s) => (
            <div key={s} className="flex items-start gap-1.5">
              <span style={{ color: BRAND.gold }}>✓</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Mensualite — seul bloc chiffre */}
      <section
        className="mt-6 p-5 rounded-lg text-white"
        style={{ background: BRAND.navy }}
      >
        <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">Prestation de services globale évolutive</div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-bold tabular-nums" style={{ color: BRAND.gold }}>
              {fmtEUR(totaux.mensualiteTotale)}
            </div>
            <div className="text-xs opacity-80 -mt-1">HT par mois</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold">{totaux.duree} mois</div>
            <div className="text-xs opacity-80">tout inclus</div>
          </div>
        </div>
      </section>

      <section className="mt-4 text-[11px] text-slate-600 leading-relaxed">
        La prestation globale évolutive vous permet de bénéficier d'un système de sécurité
        de dernière génération sans investissement initial. À l'issue de la période, vous
        pouvez reconduire l'offre avec du matériel renouvelé ou cesser l'abonnement.
      </section>
    </>
  );
}

// Derniere barriere : retire Ajax/Dahua/Vauban d'un libelle libre s'il en contient.
function sanitizeBrand(libelle: string): string {
  return libelle.replace(/\b(Ajax|Dahua|Vauban)\b/gi, "").replace(/\s+/g, " ").trim();
}
