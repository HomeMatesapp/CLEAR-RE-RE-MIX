import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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

          <p className="text-sm text-muted-foreground mb-8">Last updated: 8 June 2026</p>

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
              <p>You can use the entire site — search, role pages, provider pages, support listings — without giving us any personal data.</p>
              <p>If you choose to use the optional <strong>personalisation</strong> flow we collect the answers you give, which may include:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Age range, highest qualification, current employment status, industry you currently work in</li>
                <li>Optional self-identified circumstances (e.g. care leaver, disability, veteran, refugee, criminal record, parent or carer) that unlock relevant funded support</li>
                <li>An optional account email if you create an account to save your answers</li>
              </ul>
              <p>We also collect basic analytics (see section 4) and standard server logs for security and abuse prevention.</p>
              <p>We do <strong>not</strong> collect payment information. Clear Routes is free and has no checkout.</p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">3. How we use your data</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>To personalise role pages — for example to highlight funded routes you may be eligible for</li>
                <li>To save your personalisation answers across sessions if you create an account</li>
                <li>To understand which roles, providers and pages people use, so we can improve the product</li>
                <li>To keep the service secure and prevent abuse</li>
              </ul>
              <p>We do not sell your data, we do not use it for advertising, and we do not share it with training providers.</p>
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
              <h2 className="font-display text-xl font-bold text-foreground mb-3">5. Analytics and session recording</h2>
              <p>
                We use PostHog to capture aggregate analytics events (e.g. <code>search_submitted</code>, <code>role_page_viewed</code>,{" "}
                <code>pathway_card_clicked</code>, <code>provider_link_clicked</code>) so we can see which roles and routes are useful.
                Where session recording is enabled it is pseudonymised, masked, and never used on pages that show personal information.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">6. Cookies</h2>
              <p>
                We use a small number of essential cookies for authentication and session management, and analytics cookies via PostHog.
                Where required by UK law we ask for your consent before placing non-essential cookies.
              </p>
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
