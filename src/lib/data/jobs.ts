import { filterMarketJobs } from "@/lib/partners/job-result";
import type { JobListing } from "@/lib/types";

export const MARKET: Omit<JobListing, "why" | "fit" | "crawledMarkdown">[] = filterMarketJobs([
  {
    id: "htec-platform",
    title: "Senior Backend Engineer",
    company: "HTEC",
    city: "Beograd / hybrid",
    stack: ["Node.js", "NestJS", "PostgreSQL", "Kafka"],
    salary: "€3.8–4.6k",
    source: "HelloWorld.rs",
    url: "https://www.helloworld.rs/posao/senior-backend-engineer-htec",
    snippet:
      "Platform team building event-driven services for EU product companies. NestJS in production, ownership of SLOs, not ticket farms.",
  },
  {
    id: "vega-ai",
    title: "Full-stack Engineer, AI products",
    company: "Vega IT",
    city: "Novi Sad / remote RS",
    stack: ["TypeScript", "React", "Node.js", "LLM tooling"],
    salary: "€3.2–4.1k",
    source: "Infostud",
    url: "https://poslovi.infostud.com/posao/full-stack-ai-vega",
    snippet:
      "Small pod shipping internal copilots for Nordic clients. They want people who have shipped a public walkthrough, not a research paper.",
  },
  {
    id: "nordeus-liveops",
    title: "LiveOps / Product Engineer",
    company: "Nordeus",
    city: "Beograd",
    stack: ["TypeScript", "analytics", "experimentation"],
    salary: "€4.0–5.2k",
    source: "Nordeus careers",
    url: "https://nordeus.com/careers",
    snippet:
      "Own a slice of Top Eleven live economy. Product sense plus the ability to instrument and ship weekly.",
  },
  {
    id: "levi9-node",
    title: "Node.js Engineer",
    company: "Levi9",
    city: "Beograd / Novi Sad",
    stack: ["Node.js", "AWS", "NestJS"],
    salary: "€3.0–3.8k",
    source: "Startit jobs",
    url: "https://startit.rs/poslovi",
    snippet:
      "Long-running EU product. They filter for people who can explain a production incident, not only a framework.",
  },
  {
    id: "remote-eu-platform",
    title: "Platform Engineer (EU remote)",
    company: "Northwind Health",
    city: "Remote EU (±2h CET)",
    stack: ["TypeScript", "NestJS", "Postgres", "OpenTelemetry"],
    salary: "€5.5–7.0k",
    source: "Exa / EU boards",
    url: "https://example.com/northwind-platform",
    snippet:
      "Series B health-tech. Asynchronous culture. They hire Balkans engineers who can write RFCs and own on-call.",
  },
  {
    id: "superteam-solana",
    title: "Grant-funded builder",
    company: "Superteam Balkan",
    city: "Beograd / remote",
    stack: ["Solana", "TypeScript", "agents"],
    salary: "grants $2–8k",
    source: "Superteam Earn",
    url: "https://blkn.superteam.fun/",
    snippet:
      "Ship a public agent that moves value or reduces ops. Portfolio > CV. English + Balkan distribution is an advantage.",
  },
  {
    id: "endava-react",
    title: "React Engineer",
    company: "Endava",
    city: "Beograd",
    stack: ["React", "TypeScript", "design systems"],
    salary: "€2.8–3.6k",
    source: "HelloWorld.rs",
    url: "https://www.helloworld.rs/posao/react-endava",
    snippet:
      "Design-system heavy. They want PRs that look like a product designer sat next to you.",
  },
  {
    id: "studio-pm-ai",
    title: "AI Product Manager",
    company: "Tenderly",
    city: "Beograd / remote",
    stack: ["product", "agents", "web3 infra", "GTM"],
    salary: "€4.5–6.0k",
    source: "company site",
    url: "https://tenderly.co/careers",
    snippet:
      "Own an agentic workflow for developers. Must have shipped with engineers, written specs that got built, and talked to users.",
  },
  {
    id: "jigjoy-agent",
    title: "Founding engineer / agent runtime",
    company: "early Balkan AI studio",
    city: "Beograd",
    stack: ["TypeScript", "agents", "evals"],
    salary: "€3.5k + equity",
    source: "studio memo",
    url: "https://jigjoy.ai/",
    snippet:
      "Tiny team. They hire people who can show an agent loop, not describe one. Proof-of-work in a sandbox beats a PDF.",
  },
  {
    id: "freelance-eu",
    title: "Fractional product + delivery",
    company: "EU boutique (via Balkan network)",
    city: "Remote",
    stack: ["product", "Next.js", "stakeholder mgmt"],
    salary: "€400–700 / day",
    source: "warm intro boards",
    url: "https://www.kosmonaut.rs/",
    snippet:
      "Post-layoff path for senior ICs and PMs: 2-month discovery + MVP. They buy a Monday-ready narrative, not a CV dump.",
  },
  {
    id: "wonder-product-design",
    title: "Product Designer",
    company: "Wonder",
    city: "Beograd / remote",
    stack: ["Figma", "design systems", "product design", "UX"],
    salary: "€3.4–4.5k",
    source: "Wonder",
    url: "https://wonder.design/",
    snippet:
      "Design is the product: production React, not a handoff PNG. They hire people who can argue a flow and sit next to code.",
  },
  {
    id: "solflare-ux",
    title: "Product Designer, wallet",
    company: "Solflare",
    city: "Remote / Balkan",
    stack: ["UX", "Figma", "crypto UX", "research"],
    salary: "€4.0–5.5k",
    source: "company site",
    url: "https://www.solflare.com/",
    snippet:
      "Trading and privacy surfaces. Portfolio of shipped flows beats a moodboard. English + SR users in the same week.",
  },
  {
    id: "seven-bridges-ml",
    title: "Machine Learning Engineer",
    company: "Seven Bridges",
    city: "Beograd",
    stack: ["Python", "ML", "pipelines", "GCP"],
    salary: "€3.6–4.8k",
    source: "HelloWorld.rs",
    url: "https://www.helloworld.rs/posao/ml-engineer-seven-bridges",
    snippet:
      "Genomics pipelines, not chatbot wrappers. They filter for people who can talk about evals and data contracts.",
  },
  {
    id: "nordeus-ios",
    title: "iOS Engineer",
    company: "Nordeus",
    city: "Beograd",
    stack: ["Swift", "iOS", "game client"],
    salary: "€3.8–5.0k",
    source: "Nordeus careers",
    url: "https://nordeus.com/careers",
    snippet:
      "Live game client. They want someone who has shipped an App Store build, not a Swift playground.",
  },
  {
    id: "typeable-sre",
    title: "SRE / Platform",
    company: "Typeable",
    city: "Remote RS",
    stack: ["AWS", "Kubernetes", "Terraform", "observability"],
    salary: "€4.0–5.4k",
    source: "studio board",
    url: "https://typeable.io/",
    snippet:
      "On-call with a spine. IaC, Kubernetes, and the honesty to say when an agent should not touch prod.",
  },
  {
    id: "levi9-qa",
    title: "QA Automation Engineer",
    company: "Levi9",
    city: "Novi Sad",
    stack: ["Playwright", "TypeScript", "QA", "CI"],
    salary: "€2.4–3.2k",
    source: "Infostud",
    url: "https://poslovi.infostud.com/posao/qa-levi9",
    snippet:
      "They hire testers who break agent walkthroughs on purpose. Playwright in CI, not a spreadsheet of cases.",
  },
  {
    id: "comtrade-java",
    title: "Java Backend Engineer",
    company: "Comtrade",
    city: "Beograd",
    stack: ["Java", "Spring", "Kafka", "PostgreSQL"],
    salary: "€3.0–4.0k",
    source: "HelloWorld.rs",
    url: "https://www.helloworld.rs/posao/java-comtrade",
    snippet:
      "Long-running payments services. Spring in production. NestJS tourism does not count.",
  },
  {
    id: "us-remote-platform",
    title: "Senior Platform Engineer (Remote US)",
    company: "Northstar Labs",
    city: "Remote US",
    stack: ["TypeScript", "Node.js", "AWS", "Kubernetes"],
    salary: "$180–220k",
    source: "Greenhouse / US boards",
    url: "https://example.com/northstar-platform-us",
    snippet:
      "Async US product company. Timezone overlap with ET/PT. They hire people who write RFCs, own on-call, and can walk through a sandbox artefact on the first call.",
  },
  {
    id: "us-nyc-backend",
    title: "Backend Engineer",
    company: "Stripe-adjacent fintech (NYC)",
    city: "New York / hybrid",
    stack: ["TypeScript", "PostgreSQL", "Kafka", "AWS"],
    salary: "$165–200k",
    source: "Ashby / LinkedIn",
    url: "https://example.com/nyc-backend",
    snippet:
      "Payments platform in New York. They filter for production scars, not visa essays. English-first interviews, US market hours.",
  },
  {
    id: "us-sf-fullstack",
    title: "Full-stack Engineer, AI products",
    company: "Bay Area series B",
    city: "San Francisco / Remote US",
    stack: ["TypeScript", "React", "Python", "LLM tooling"],
    salary: "$175–215k",
    source: "Lever / Indeed",
    url: "https://example.com/sf-ai-fullstack",
    snippet:
      "Ship internal copilots for US customers. They want a public walkthrough, not a research paper. Authorized to work in the US or remote-US contractors.",
  },
]);

export function listingMarkdown(job: (typeof MARKET)[number]): string {
  return `# ${job.title} — ${job.company}

**Location:** ${job.city}
**Stack:** ${job.stack.join(", ")}
**Comp:** ${job.salary}
**Source:** ${job.source}

## What you will do
${job.snippet}

## How they actually hire
They will ask you to walk through something you shipped this month. A public repo with a README, a live URL, and one metric beats ten years of “responsible for”.

## Red flags they filter
- Framework tourism without production scars
- Agent walkthroughs that only chat
- No opinion about users in RS / EU
`;
}
