import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Shield, Mail, LogIn, UserPlus, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase, useDemoData } from "@/lib/supabase";
import { DEMO_STATE } from "@/lib/demo-data";
import { Button } from "@/components/ui/Button";
import { Card, Input, Select } from "@/components/ui/primitives";
import { createCommercial, getCommercialByEmail } from "@/lib/db";
import { AuthContext, type AuthContextValue } from "@/hooks/useAuth";
import type { Commercial, Role } from "@/types";

// ============================================================================
// AUTH GATE
// ============================================================================
type Phase = "loading" | "login" | "link_sent" | "needs_profile" | "authenticated";

export function AuthGate({ children }: { children: ReactNode }) {
  // Mode demo : bypass auth, utilise le premier commercial demo (Stephane)
  if (useDemoData || !supabase) {
    const fake: Commercial = DEMO_STATE.commerciaux[0];
    const ctx: AuthContextValue = {
      currentCommercial: fake,
      email: fake.email,
      signOut: async () => {
        /* no-op en demo */
      },
      isDemoMode: true,
      reloadCommercial: async () => {
        /* no-op */
      },
    };
    return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
  }

  return <SupabaseAuthGate>{children}</SupabaseAuthGate>;
}

// ============================================================================
// MODE SUPABASE
// ============================================================================
function SupabaseAuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState<string>("");
  const [currentCommercial, setCurrentCommercial] = useState<Commercial | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check session + lookup commercial
  const resolveCommercial = useCallback(async (s: Session) => {
    const userEmail = s.user.email ?? "";
    setEmail(userEmail);
    try {
      const c = await getCommercialByEmail(userEmail);
      if (c) {
        setCurrentCommercial(c);
        setPhase("authenticated");
      } else {
        setCurrentCommercial(null);
        setPhase("needs_profile");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement du profil");
      setPhase("needs_profile");
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    // Session initiale
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        void resolveCommercial(data.session);
      } else {
        setPhase("login");
      }
    });

    // Sync sur les changements
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) void resolveCommercial(s);
      else {
        setCurrentCommercial(null);
        setPhase("login");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [resolveCommercial]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const reloadCommercial = useCallback(async () => {
    if (session) await resolveCommercial(session);
  }, [session, resolveCommercial]);

  // --- Rendu des etats d'auth ---
  if (phase === "loading") return <LoadingScreen />;
  if (phase === "login" || phase === "link_sent") {
    return (
      <LoginScreen
        onLinkSent={() => setPhase("link_sent")}
        sent={phase === "link_sent"}
        initialEmail={email}
        setInitialEmail={setEmail}
      />
    );
  }
  if (phase === "needs_profile" && session) {
    return (
      <CreateProfileScreen
        email={session.user.email ?? email}
        onCreated={(c) => {
          setCurrentCommercial(c);
          setPhase("authenticated");
        }}
        onSignOut={signOut}
        externalError={error}
      />
    );
  }

  // phase === "authenticated"
  const ctx: AuthContextValue = {
    currentCommercial,
    email: session?.user.email ?? null,
    signOut,
    isDemoMode: false,
    reloadCommercial,
  };
  return <AuthContext.Provider value={ctx}>{children}</AuthContext.Provider>;
}

// ============================================================================
// ECRANS
// ============================================================================
function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B1E3F] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#C9A961] flex items-center justify-center">
            <Shield size={20} className="text-[#0B1E3F]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-xl tracking-tight">FOLONEO</div>
            <div className="text-[11px] text-slate-400 -mt-0.5">Sécurité électronique</div>
          </div>
        </div>
        <Card className="p-6 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
          {children}
        </Card>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0B1E3F] text-slate-100 flex items-center justify-center">
      <RefreshCw size={20} className="animate-spin mr-2" /> Vérification de la session…
    </div>
  );
}

function LoginScreen({
  onLinkSent,
  sent,
  initialEmail,
  setInitialEmail,
}: {
  onLinkSent: () => void;
  sent: boolean;
  initialEmail: string;
  setInitialEmail: (v: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: initialEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      onLinkSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'envoi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame>
      <h1 className="text-lg font-semibold mb-1">Connexion</h1>
      <p className="text-sm text-slate-500 mb-5">
        Entre ton email Foloneo — tu recevras un lien magique pour te connecter.
      </p>
      {sent ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 text-sm">
            <Mail size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              Lien envoyé à <strong>{initialEmail}</strong>. Ouvre-le depuis ce navigateur pour
              terminer la connexion.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setInitialEmail("");
              onLinkSent();
            }}
          >
            Renvoyer avec un autre email
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={initialEmail}
            onChange={(e) => setInitialEmail(e.target.value)}
            placeholder="prenom.nom@foloneo.fr"
            autoFocus
          />
          {error && (
            <div className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle size={12} /> {error}
            </div>
          )}
          <Button
            type="submit"
            variant="gold"
            size="md"
            icon={LogIn}
            className="w-full"
            disabled={loading || !initialEmail}
          >
            {loading ? "Envoi…" : "Recevoir le lien magique"}
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}

function CreateProfileScreen({
  email,
  onCreated,
  onSignOut,
  externalError,
}: {
  email: string;
  onCreated: (c: Commercial) => void;
  onSignOut: () => void;
  externalError: string | null;
}) {
  const [prenom, setPrenom] = useState<string>("");
  const [nom, setNom] = useState<string>("");
  const [telephone, setTelephone] = useState<string>("");
  const [role, setRole] = useState<Role>("dirigeant");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(externalError);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await createCommercial({
        nom,
        prenom,
        email,
        telephone,
        role,
        objectifMensuel: 25000,
        commissionTaux: { achat: 0.08, leasing: 0.05, maintenance: 0.1 },
        couleur: "#C9A961",
        actif: true,
      });
      onCreated(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de creation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthFrame>
      <h1 className="text-lg font-semibold mb-1">Création de ton profil</h1>
      <p className="text-sm text-slate-500 mb-5">
        Aucun commercial n'est rattaché à <strong>{email}</strong>. Complète ton profil pour
        continuer.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prénom"
            required
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
          />
          <Input label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
        </div>
        <Input
          label="Téléphone"
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
        />
        <Select label="Rôle" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="dirigeant">Dirigeant</option>
          <option value="commercial">Commercial</option>
          <option value="technicien">Technicien</option>
        </Select>
        {error && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={UserPlus}
            disabled={saving || !prenom || !nom}
          >
            {saving ? "Création…" : "Créer mon profil"}
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={onSignOut}>
            Changer d'email
          </Button>
        </div>
      </form>
    </AuthFrame>
  );
}
