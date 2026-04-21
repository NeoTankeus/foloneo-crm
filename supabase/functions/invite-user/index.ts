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
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifie" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(authHeader);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Verifier que l'appelant est dirigeant
    const { data: callerCommercial } = await admin
      .from("commerciaux")
      .select("role")
      .eq("email", caller.email ?? "")
      .maybeSingle();
    if (!callerCommercial || callerCommercial.role !== "dirigeant") {
      return new Response(
        JSON.stringify({ error: "Seul un dirigeant peut inviter" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) Envoyer le mail d'invitation (magic link premiere connexion)
    // @ts-expect-error Deno global
    const APP_URL = Deno.env.get("APP_URL") ?? req.headers.get("origin") ?? "";
    const { data: inviteData, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: APP_URL || undefined,
      });

    if (inviteErr) {
      return new Response(
        JSON.stringify({ error: `Invitation: ${inviteErr.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4) Creer la fiche commercial liee
    const { data: commercial, error: cErr } = await admin
      .from("commerciaux")
      .insert({
        user_id: inviteData.user.id,
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
      await admin.auth.admin.deleteUser(inviteData.user.id);
      return new Response(
        JSON.stringify({ error: `Creation commercial: ${cErr.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, commercial }),
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
