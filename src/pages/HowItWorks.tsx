import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const HowItWorks = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Helmet><title>How Clear Routes works</title></Helmet>
    <Navbar />
    <main className="flex-1 container mx-auto px-4 py-16 max-w-2xl">
      <h1 className="font-display text-4xl font-medium text-foreground">How Clear Routes works</h1>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-foreground">
        <p>Every claim has a source.</p>
        <p>We don't list providers that haven't earned it.</p>
        <p>Payment never changes a rating.</p>
        <p>The uncomfortable truth appears even when it's inconvenient.</p>
        <p>We're a UK careers publisher, not a comparison site. The data is infrastructure. The editorial judgement is the product.</p>
        <p>
          <Link to="/sources" className="text-primary hover:underline">Sources & methodology →</Link>
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default HowItWorks;
