import { useState } from "react";
import { z } from "zod";
import { Loader2, Send, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Opportunity } from "@/lib/opportunities/types";

const schema = z.object({
  name: z.string().trim().min(1, "Please add your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export interface EnquiryContext {
  decisionId: string;
  roleSlug: string | null;
  roleName: string | null;
  bestRoute: string | null;
  area: string | null;
  needToEarn: string | null;
  qualificationLevel: string | null;
}

export function EnquiryDialog({
  open,
  onOpenChange,
  opportunity,
  context,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opportunity: Opportunity | null;
  context: EnquiryContext;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!opportunity) return null;

  const submit = async () => {
    setError(null);
    const parsed = schema.safeParse({ name, email, phone, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    if (!consent) {
      setError("Please tick the consent box to continue.");
      return;
    }
    if (!user) {
      setError("Please sign in first.");
      return;
    }
    setSubmitting(true);
    const shared_context = {
      role_slug: context.roleSlug,
      role_name: context.roleName,
      best_route: context.bestRoute,
      area: context.area,
      need_to_earn: context.needToEarn,
      qualification_level: context.qualificationLevel,
    };
    const { error: insErr } = await supabase.from("opportunity_enquiries").insert({
      user_id: user.id,
      decision_id: context.decisionId,
      opportunity_id: opportunity.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message || null,
      shared_context,
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
    } as never);
    setSubmitting(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    toast({
      title: "Interest registered",
      description: "We've saved your enquiry. The provider may follow up if available.",
    });
    onOpenChange(false);
    setMessage("");
    setConsent(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register interest</DialogTitle>
          <DialogDescription className="text-xs">
            Clear Routes can share your contact details and selected route context with this
            provider/employer so they can contact you. We will only share this if you agree.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <label className="text-xs font-medium text-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground mb-1">
              <ShieldCheck className="h-3.5 w-3.5" /> What we'll share
            </p>
            Your name, email{phone ? ", phone" : ""}, and route context (role, best route, area,
            earning need, qualification level). We do <strong>not</strong> share sensitive support
            circumstances.
          </div>

          <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <span>I agree for Clear Routes to share the above with this provider/employer.</span>
          </label>

          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !consent}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Register interest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
