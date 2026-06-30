import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent as ConsentValue,
} from "@/lib/posthog";

const useConsentState = () => {
  const [consent, setConsent] = useState<ConsentValue | null>(() => getAnalyticsConsent());

  useEffect(() => {
    const sync = () => setConsent(getAnalyticsConsent());
    window.addEventListener(ANALYTICS_CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [consent, setConsent] as const;
};

export const AnalyticsPreferenceControls = () => {
  const [consent, setConsent] = useConsentState();

  const choose = (value: ConsentValue) => {
    setAnalyticsConsent(value);
    setConsent(value);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-foreground">
        Current setting: <strong>{consent === "granted" ? "Analytics allowed" : "Essential only"}</strong>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => choose("granted")}>Allow analytics</Button>
        <Button size="sm" variant="outline" onClick={() => choose("denied")}>Essential only</Button>
      </div>
    </div>
  );
};

const AnalyticsConsent = () => {
  const [consent, setConsent] = useConsentState();

  if (consent) return null;

  const choose = (value: ConsentValue) => {
    setAnalyticsConsent(value);
    setConsent(value);
  };

  return (
    <aside
      role="dialog"
      aria-label="Analytics preferences"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-xl border border-border bg-background p-4 shadow-xl"
    >
      <p className="text-sm font-semibold text-foreground">Analytics preferences</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Clear Routes uses essential storage for sign-in and saved decisions. With your permission,
        PostHog also records basic product usage so we can improve the service. No analytics are
        loaded until you agree. See the <Link to="/privacy" className="text-primary underline">privacy policy</Link>.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => choose("granted")}>Allow analytics</Button>
        <Button size="sm" variant="outline" onClick={() => choose("denied")}>Essential only</Button>
      </div>
    </aside>
  );
};

export default AnalyticsConsent;
