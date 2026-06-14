import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const faqSections = [
  {
    heading: "About Clear Routes",
    questions: [
      {
        q: "What is Clear Routes?",
        a: "Clear Routes is a free UK career library. Search any of 1,000 roles and you get an honest picture of what the job actually involves, who tends to do well in it, the realistic ways in (school leaver, graduate, adjacent career, or no background), salary ranges across the country, how competitive it is, the impact AI is having on it, and the UK training providers and apprenticeships that lead into it. No quizzes, no paywalls, no AI-generated pathways.",
      },
      {
        q: "Is Clear Routes free?",
        a: "Yes — completely free. There is no signup wall, no £49 unlock, and no subscription. We may add optional personalisation in future (where you tell us about yourself to filter providers), but the core role pages will always be free and open.",
      },
      {
        q: "How is Clear Routes different from the National Careers Service?",
        a: "The National Careers Service gives you broad, generic guidance and a long list of jobs. Clear Routes is opinionated. For every role we tell you the honest truth — the parts of the job people don't talk about, how saturated the market is, where AI is reshaping the work, what the realistic salary actually looks like, and which training routes are worth your time. We name providers and apprenticeships directly, with sources.",
      },
      {
        q: "Is Clear Routes only for the UK?",
        a: "Yes. Every salary range, training provider, apprenticeship, and support organisation on the site is UK-specific. If you are based outside the UK the content will not apply to your situation.",
      },
    ],
  },
  {
    heading: "Role pages",
    questions: [
      {
        q: "Where do the roles come from?",
        a: "We curate a library of 1,000 UK roles — from the very common (Software Engineer, Primary Teacher, Nurse) to the niche (Wind Turbine Technician, Forensic Accountant, Patent Attorney). The list is built from ONS occupation data, UCAS subject areas, government apprenticeship standards, and direct provider listings.",
      },
      {
        q: "How are the four pathways chosen?",
        a: "Every role shows up to four realistic ways in: school leaver, graduate, adjacent career, and no background. The pathway content is hand-written per role from a single source spreadsheet (the 'Why' field), then mapped into the four routes. If a route genuinely does not exist for a role we say so rather than invent one.",
      },
      {
        q: "How accurate are the salary figures?",
        a: "Salary ranges are based on ONS Annual Survey of Hours and Earnings, current UK job postings, and sector reports. We show ranges by experience level (entry, mid, senior) rather than single numbers, and flag where London skews the figure. Every role page lists when the data was last reviewed.",
      },
      {
        q: "What does the AI impact badge mean?",
        a: "Each role is labelled low, medium, or high AI exposure based on published research (notably the OECD and ONS automation studies, plus more recent generative-AI exposure indices). Low means the day-to-day work is largely safe from automation in the next 5–10 years. High means substantial parts of the role are already being automated. We explain the reasoning on each page.",
      },
      {
        q: "Why do you show competition and a 'reality check'?",
        a: "Because most career sites only show you the upside. Some roles look attractive but have hundreds of applicants per junior post, or pay poorly relative to the qualifications required, or have a working culture few people will tolerate long-term. We tell you these things up front so you can decide with eyes open.",
      },
    ],
  },
  {
    heading: "Providers, apprenticeships and support",
    questions: [
      {
        q: "How do you choose which training providers to list?",
        a: "Providers are curated from Ofsted-rated training organisations, recognised UK universities, registered Skills Bootcamp providers on the DfE list, and established professional bodies. We do not accept payment from providers to appear. Where a provider has a poor track record or unclear outcomes we leave them off.",
      },
      {
        q: "What is a Skills Bootcamp?",
        a: "Skills Bootcamps are free or heavily subsidised UK training programmes funded by the Department for Education, typically 12–16 weeks long, in sectors like tech, data, digital marketing, construction and green skills. Availability depends on your region and the Combined Authority you live under. Where a role page lists a bootcamp provider, we link to the official course page so you can check current eligibility.",
      },
      {
        q: "What is a degree apprenticeship?",
        a: "A degree apprenticeship lets you earn a full UK degree while working and being paid, with your tuition fees covered by your employer. They typically take 3–4 years. We surface degree apprenticeships on the relevant role pages and list the universities offering them.",
      },
      {
        q: "What's on the Support page?",
        a: "The /support page lists funded UK programmes and organisations that change what's available to you — government schemes, grants, and access programmes for groups including under-25s, care leavers, people with disabilities, women and non-binary people, veterans, people with criminal records, refugees, and career changers. Most people who qualify for these don't know they exist.",
      },
    ],
  },
  {
    heading: "Trust, sources and corrections",
    questions: [
      {
        q: "Where is your data sourced?",
        a: "Salary data: ONS ASHE, plus current UK job board postings. Apprenticeship data: the official Institute for Apprenticeships standards and gov.uk Find an Apprenticeship. Providers: Ofsted, the DfE Skills Bootcamps register, UCAS, and direct provider listings. Funding and support: gov.uk, Combined Authority websites, and the named organisations themselves. The /sources page lists everything in one place.",
      },
      {
        q: "How often is the data refreshed?",
        a: "Salaries and competition signals are reviewed quarterly. Apprenticeships, bootcamp availability, and funded support programmes are reviewed at least twice a year and after every government spending announcement. Each role page shows a 'last reviewed' date.",
      },
      {
        q: "How do I report something that is wrong?",
        a: "Email hello@clearroutes.co.uk with the role or provider and what is wrong. We investigate and correct verified inaccuracies as quickly as we can.",
      },
      {
        q: "Do you give regulated careers or financial advice?",
        a: "No. Clear Routes is an information service, not a regulated careers adviser and not a financial adviser. For regulated guidance speak to the National Careers Service, a qualified careers adviser, or — for money matters — an FCA-regulated adviser.",
      },
    ],
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqSections.flatMap((section) =>
    section.questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    }))
  ),
};

const Faq = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>FAQ — Clear Routes | Honest UK career information</title>
        <meta
          name="description"
          content="Frequently asked questions about Clear Routes — how role pages work, where the data comes from, how we choose providers, and why everything is free."
        />
        <link rel="canonical" href="https://clearroutes.co.uk/faq" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto px-4 py-12 md:py-20 max-w-3xl">
          <header className="mb-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-muted-foreground">
              Honest answers about how Clear Routes works.
            </p>
          </header>

          {faqSections.map((section) => (
            <section key={section.heading} className="mb-12">
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-6 border-b border-border pb-3">
                {section.heading}
              </h2>

              <div className="space-y-8">
                {section.questions.map((item) => (
                  <article key={item.q}>
                    <h3 className="font-display text-base md:text-lg font-semibold text-foreground mb-2">
                      {item.q}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Faq;
