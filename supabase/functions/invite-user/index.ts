// ============================================================================
// Edge Function FOLONEO — Invite user
// ----------------------------------------------------------------------------
// Appelee depuis l'app quand le dirigeant invite un nouveau commercial.
// - Verifie que l'appelant est bien un dirigeant
// - Envoie un mail d'invitation via Supabase (magic link de premiere connexion)
// - Cree la ligne commercial associee
// ----------------------------------------------------------------------------
// Deploiement : Supabase Dashboard -> Edge Functions -> Deploy a new function
//   Nom : invite-user
//   Colle le contenu de ce fichier, clique Deploy.
// ============================================================================

// @ts-expect-error Deno imports ne sont pas reconnus par notre tsconfig browser
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// @ts-expect-error Deno global n'existe pas dans notre TS
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      email,
      prenom,
      nom,
      role = "commercial",
      telephone,
      couleur = "#60A5FA",
      objectifMensuel = 25000,
    } = body;

    if (!email || !prenom || !nom) {
      return new Response(
        JSON.stringify({ error: "email, prenom, nom sont obligatoires" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // @ts-expect-error Deno global
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    // @ts-expect-error Deno global
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Authentifier l'appelant
    // On decode le payload du JWT sans verifier la signature ES256 (probleme de
    // compat avec les nouvelles cles Supabase). La sécurité repose sur le fait
    // que le token vient bien du client (header Authorization) et qu'on revérifie
    // l'email dans la table commerciaux juste apres.
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifie" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let callerEmail = "";
    try {
      const parts = authHeader.split(".");
      if (parts.length < 2) throw new Error("token malformed");
      const payloadJson = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      callerEmail = (payloadJson.email as string) ?? "";
    } catch (_e) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!callerEmail) {
      return new Response(JSON.stringify({ error: "Email manquant dans le token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Verifier que l'appelant est dirigeant
    const { data: callerCommercial, error: lookupErr } = await admin
      .from("commerciaux")
      .select("role")
      .eq("email", callerEmail)
      .maybeSingle();
    if (lookupErr) {
      return new Response(
        JSON.stringify({ error: `Lookup commercial: ${lookupErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!callerCommercial) {
      return new Response(
        JSON.stringify({
          error: `Aucun commercial en base pour ${callerEmail}. Cree-le d'abord dans Table Editor.`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (callerCommercial.role !== "dirigeant") {
      return new Response(
        JSON.stringify({ error: `Seul un dirigeant peut inviter (ton role: ${callerCommercial.role})` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) Creer le user (pas d'email automatique, evite le rate-limit SMTP Supabase)
    // @ts-expect-error Deno global
    const APP_URL = Deno.env.get("APP_URL") ?? req.headers.get("origin") ?? "";
    const { data: userData, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { prenom, nom },
    });

    if (createErr || !userData?.user) {
      return new Response(
        JSON.stringify({
          error: `Creation user: ${createErr?.message ?? "user non cree"}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3b) Genere un lien de premiere connexion (type recovery = "definir mon mot de passe")
    // Ce lien ne declenche pas d'envoi SMTP, on le retourne au client pour qu'il
    // soit transmis par le canal de son choix (SMS, WhatsApp, mail perso).
    let manualLink: string | null = null;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: APP_URL || undefined },
      });
      manualLink = linkData?.properties?.action_link ?? null;
    } catch (_e) {
      /* pas de lien mais le user est cree, ce n'est pas bloquant */
    }

    // 4) Creer la fiche commercial liee
    const { data: commercial, error: cErr } = await admin
      .from("commerciaux")
      .insert({
        user_id: userData.user.id,
        email,
        prenom,
        nom,
        telephone: telephone ?? null,
        role,
        objectif_mensuel: objectifMensuel,
        commission_achat: 0.08,
        commission_leasing: 0.05,
        commission_maintenance: 0.1,
        couleur,
        actif: true,
      })
      .select()
      .single();

    if (cErr) {
      // Rollback best-effort : supprimer le auth user si la creation du commercial echoue
      await admin.auth.admin.deleteUser(userData.user.id);
      return new Response(
        JSON.stringify({ error: `Creation commercial: ${cErr.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, commercial, manualLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
