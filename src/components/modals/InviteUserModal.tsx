import { useState } from "react";
import { UserPlus, AlertTriangle, Mail, CheckCircle2, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/overlays";
import { Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import type { Commercial, Role } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onInvited: (c: Commercial) => void;
}

const COULEURS = ["#C9A961", "#60A5FA", "#A78BFA", "#10B981", "#F59E0B", "#EF4444"];

export function InviteUserModal({ open, onClose, onInvited }: Props) {
  const [email, setEmail] = useState<string>("");
  const [prenom, setPrenom] = useState<string>("");
  const [nom, setNom] = useState<string>("");
  const [telephone, setTelephone] = useState<string>("");
  const [role, setRole] = useState<Role>("commercial");
  const [objectifMensuel, setObjectifMensuel] = useState<number>(25000);
  const [couleur, setCouleur] = useState<string>("#60A5FA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  async function invite() {
    if (!supabase) {
      setError("Supabase n'est pas configure (mode demo)");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, prenom, nom, telephone, role, objectifMensuel, couleur },
      });
      // Recupere le vrai message d'erreur renvoye par la function
      // (par defaut le SDK Supabase donne "Edge Function returned a non-2xx status code"
      // ce qui ne dit rien sur la vraie cause)
      if (error) {
        let detail: string = error.message;
        const ctx = (error as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          try {
            const body = await ctx.text();
            try {
              const json = JSON.parse(body) as { error?: string };
              if (json.error) detail = json.error;
              else detail = body || detail;
            } catch {
              if (body) detail = body;
            }
          } catch {
            /* ignore */
          }
        }
        throw new Error(detail);
      }
      const payload = data as {
        success?: boolean;
        commercial?: unknown;
        error?: string;
        manualLink?: string | null;
      };
      if (!payload.success || !payload.commercial) {
        throw new Error(payload.error ?? "Reponse invalide");
      }
      const commercial = payload.commercial as Commercial;
      setSuccess(`Invitation envoyée à ${email}.`);
      setManualLink(payload.manualLink ?? null);
      onInvited(commercial);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Erreur d'invitation (Edge Function deployee ?)";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inviter un commercial"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Fermer
          </Button>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={invite}
            disabled={loading || !email || !prenom || !nom}
          >
            {loading ? "Envoi…" : "Envoyer l'invitation"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="text-xs text-slate-500 flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <Mail size={14} className="flex-shrink-0 mt-0.5 text-blue-600" />
          <div>
            Le nouvel utilisateur recevra un mail de Supabase avec un lien pour créer son mot
            de passe et accéder au CRM. Son profil commercial sera créé automatiquement.
          </div>
        </div>

        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prenom.nom@foloneo.fr"
          autoFocus
        />
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
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Rôle"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="commercial">Commercial</option>
            <option value="technicien">Technicien</option>
            <option value="dirigeant">Dirigeant</option>
          </Select>
          <Input
            label="Objectif mensuel (€)"
            type="number"
            min={0}
            value={objectifMensuel}
            onChange={(e) => setObjectifMensuel(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
            Couleur d'identification
          </label>
          <div className="flex gap-2 flex-wrap">
            {COULEURS.map((c) => (
              <button
                key={c}
                onClick={() => setCouleur(c)}
                className={`w-8 h-8 rounded-lg transition-transform ${couleur === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        {error && (
          <div className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
        {success && (
          <div className="text-xs text-emerald-700 flex items-start gap-1 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg">
            <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" />
            <div>{success}</div>
          </div>
        )}
        {manualLink && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
            <div className="text-xs font-semibold text-amber-900 dark:text-amber-300">
              Lien de connexion manuel (en cas de non-réception du mail)
            </div>
            <div className="text-[11px] text-amber-800 dark:text-amber-300">
              Copie ce lien et envoie-le à {email} par SMS, WhatsApp ou mail perso. Il lui
              suffira de cliquer pour définir son mot de passe et se connecter.
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={manualLink}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 h-8 px-2 text-[10px] rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 font-mono"
              />
              <Button
                size="sm"
                variant={copied ? "primary" : "gold"}
                icon={copied ? Check : Copy}
                onClick={async () => {
                  await navigator.clipboard.writeText(manualLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Nouveau invité : reset le formulaire pour enchainer une autre invitation
                setEmail("");
                setPrenom("");
                setNom("");
                setTelephone("");
                setObjectifMensuel(25000);
                setManualLink(null);
                setSuccess(null);
              }}
            >
              Inviter quelqu'un d'autre
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
