import { beforeEach, describe, expect, it, vi } from "vitest";

const posthogMock = {
  init: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  startSessionRecording: vi.fn(),
  stopSessionRecording: vi.fn(),
};

vi.mock("posthog-js", () => ({ default: posthogMock }));

const loadModule = async () => {
  vi.resetModules();
  vi.stubEnv("VITE_POSTHOG_KEY", "ph_test_key");
  return import("./posthog");
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("analytics consent", () => {
  it("does not initialise or capture before consent", async () => {
    const analytics = await loadModule();
    analytics.initPostHog();
    analytics.trackEvent("test_event");

    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("initialises before notifying listeners when consent is granted", async () => {
    const analytics = await loadModule();
    let initialisedAtEvent = false;
    const listener = () => {
      initialisedAtEvent = posthogMock.init.mock.calls.length === 1;
    };
    window.addEventListener(analytics.ANALYTICS_CONSENT_EVENT, listener, { once: true });

    analytics.setAnalyticsConsent("granted");

    expect(localStorage.getItem(analytics.ANALYTICS_CONSENT_KEY)).toBe("granted");
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    expect(posthogMock.opt_in_capturing).toHaveBeenCalledTimes(1);
    expect(initialisedAtEvent).toBe(true);
  });

  it("captures and identifies only after consent", async () => {
    const analytics = await loadModule();
    analytics.setAnalyticsConsent("granted");
    analytics.trackEvent("role_page_viewed", { slug: "nurse" });
    analytics.identifyUser("user-1");

    expect(posthogMock.capture).toHaveBeenCalledWith("role_page_viewed", { slug: "nurse" });
    expect(posthogMock.identify).toHaveBeenCalledWith("user-1");
  });

  it("stops, resets and opts out when consent is withdrawn", async () => {
    const analytics = await loadModule();
    analytics.setAnalyticsConsent("granted");
    analytics.setAnalyticsConsent("denied");
    analytics.trackEvent("should_not_send");

    expect(posthogMock.stopSessionRecording).toHaveBeenCalled();
    expect(posthogMock.reset).toHaveBeenCalled();
    expect(posthogMock.opt_out_capturing).toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });
});
