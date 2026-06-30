import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = "https://eu.i.posthog.com";
export const ANALYTICS_CONSENT_KEY = "cr_analytics_consent";
export const ANALYTICS_CONSENT_EVENT = "cr-analytics-consent-changed";

export type AnalyticsConsent = "granted" | "denied";

let initialized = false;

export const getAnalyticsConsent = (): AnalyticsConsent | null => {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
};

export const initPostHog = () => {
  if (initialized || getAnalyticsConsent() !== "granted") return;
  if (!POSTHOG_KEY) {
    console.warn("PostHog key not configured — analytics disabled");
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false,
    disable_session_recording: true,
    person_profiles: "identified_only",
  });
  initialized = true;
};

export const setAnalyticsConsent = (consent: AnalyticsConsent) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);

  if (consent === "granted") {
    initPostHog();
    if (initialized) posthog.opt_in_capturing();
  } else if (initialized) {
    posthog.stopSessionRecording();
    posthog.reset();
    posthog.opt_out_capturing();
  }

  // Dispatch only after PostHog has been initialised or disabled so listeners
  // (for example AuthProvider) observe the final consent state.
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: consent }));
};

const canCapture = () => initialized && getAnalyticsConsent() === "granted";

export const identifyUser = (userId: string) => {
  if (!canCapture()) return;
  posthog.identify(userId);
};

export const resetUser = () => {
  if (!initialized) return;
  posthog.reset();
};

export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  if (!canCapture()) return;
  posthog.capture(event, properties);
};

// Session recording remains disabled by default. This helper is retained for
// callers, but only starts after explicit analytics consent.
export const enableSessionRecording = () => {
  if (!canCapture()) return;
  posthog.startSessionRecording();
};

export const disableSessionRecording = () => {
  if (!initialized) return;
  posthog.stopSessionRecording();
};

export { posthog };
