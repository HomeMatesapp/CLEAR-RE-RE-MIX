import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AnalyticsPreferenceControls } from "@/components/AnalyticsConsent";

const Privacy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Privacy Policy — Clear Routes</title>
        <meta name="description" content="Privacy Policy for Clear Routes — how we handle your data." />
        <link rel="canonical" href="https://clearroutes.co.uk/privacy" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 py-12 md:py-20 max-w-3xl">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
            Privacy Policy
          </h1>

          <p className="text-sm text-muted-foreground mb-8">Last updated: 29 June 2026</p>

          <div className="prose prose-sm max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">1. Who we are</h2>
              <p>
                Clear Routes is a UK-based, free-to-use career information service. You can contact us at{" "}
                <a href="mailto:hello@clearroutes.co.uk" className="text-primary hover:underline">
                  hello@clearroutes.co.uk
                </a>
                . For the purposes of UK GDPR we are the data controller for any personal data described below.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">2. What we collect</h2>
              <p>You can browse role pages, run a Reality-check and view support listings without giving us any personal data.</p>
              <p>If you choose to fill in your <strong>Decision Profile</strong> or save a <strong>career decision</strong> (a saved route check) we collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>The answers you give in the Reality-check (e.g. available hours, training budget, location, qualifications, current situation)</li>
                <li>Optional self-identified circumstances (e.g. care leaver, disability, veteran, refugee, criminal record, parent or carer) used to surface relevant support and funding</li>
                <li>The roles you've reality-checked and the route judgements you've saved as career decisions</li>
                <li>An optional account email if you create an account to save your decisions</li>
              </ul>
              <p>We also collect basic analytics (see section 4) and standard server logs for security and abuse prevention.</p>
              <p>We do <strong>not</strong> collect payment information. Clear Routes has no checkout.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">3. How we use your data</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>To generate your Reality-check route judgement for a specific role, using your Decision Profile answers as input</li>
                <li>To save your career decisions so you can revisit and compare them</li>
                <li>To surface UK support and funding programmes that may be relevant to your situation</li>
                <li>To understand which roles, routes and pages people use, so we can improve the product</li>
                <li>To keep the service secure and prevent abuse</li>
              </ul>
              <p>
                The Reality-check uses a deterministic rules engine. Your answers are evaluated against reviewed route and
                entry-requirement logic; they are not sent to a large language model. We do not use your answers for
                advertising and we do not share them with training providers.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">4. Third-party services</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="text-left p-2 border-b border-border text-foreground">Service</th>
                      <th className="text-left p-2 border-b border-border text-foreground">Purpose</th>
                      <th className="text-left p-2 border-b border-border text-foreground">Safeguards</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-2">Lovable Cloud (backend)</td>
                      <td className="p-2">Database, authentication, edge functions</td>
                      <td className="p-2">EU-hosted, GDPR compliant</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-2">PostHog</td>
                      <td className="p-2">Product analytics (page views, search queries, outbound link clicks)</td>
                      <td className="p-2">EU-hosted instance, GDPR compliant</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">5. Analytics</h2>
              <p>
                With your permission, we use PostHog to capture limited product events such as searches, role-page views and
                outbound provider-link clicks. PostHog is not initialised until you choose “Allow analytics”. We identify a
                signed-in account only by its internal user ID and do not send the account email to PostHog. Session recording
                is disabled.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">6. Cookies</h2>
              <p>
                We use essential browser storage for authentication, security and saved decisions. PostHog analytics storage
                is created only after you explicitly allow analytics. Choosing “Essential only” leaves analytics disabled.
              </p>
              <div className="mt-4"><AnalyticsPreferenceControls /></div>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">7. Your rights</h2>
              <p>Under UK GDPR you have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Ask us to correct inaccurate data</li>
                <li>Ask us to delete your data</li>
                <li>Object to or restrict processing</li>
                <li>Receive a portable copy of your data</li>
                <li>Complain to the Information Commissioner's Office (ico.org.uk)</li>
              </ul>
              <p>
                To exercise any of these rights email{" "}
                <a href="mailto:hello@clearroutes.co.uk" className="text-primary hover:underline">
                  hello@clearroutes.co.uk
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">8. Data retention</h2>
              <p>
                Personalisation answers are kept for as long as your account is active. Analytics events are retained for up to 24 months in
                aggregate form. If you request deletion we will remove your personal data within 30 days.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">9. Changes to this policy</h2>
              <p>We may update this policy from time to time. The "last updated" date at the top of the page will change when we do.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">10. Contact</h2>
              <p>
                Questions? Email{" "}
                <a href="mailto:hello@clearroutes.co.uk" className="text-primary hover:underline">
                  hello@clearroutes.co.uk
                </a>
                .
              </p>
            </section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Privacy;
