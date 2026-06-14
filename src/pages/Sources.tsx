import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Sources = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Helmet><title>Sources & methodology | Clear Routes</title></Helmet>
    <Navbar />
    <main className="flex-1 container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="font-display text-4xl font-medium text-foreground">Sources & methodology</h1>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-foreground">
        <section>
          <h2 className="font-display font-semibold text-lg mb-2">What counts as High Demand</h2>
          <p>National shortage, significant growth, or consistently more vacancies than candidates. Always cited from DfE, ONS, or sector body data — never assigned on intuition.</p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg mb-2">Salary sources</h2>
          <p>ONS Annual Survey of Hours and Earnings (ASHE), LinkedIn Salary Insights, sector surveys.</p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg mb-2">Demand sources</h2>
          <p>DfE skills shortage data, ONS Labour Force Survey, sector bodies.</p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg mb-2">Provider methodology</h2>
          <p>We check what providers publish. "Published outcomes" means employment rate is openly available. Where it isn't, the listing says so.</p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg mb-2">Editorial independence</h2>
          <p>No provider pays to improve their assessment. Payment buys a lead-capture button — it does not change ratings, ordering, or honest notes.</p>
        </section>
      </div>
    </main>
    <Footer />
  </div>
);

export default Sources;
