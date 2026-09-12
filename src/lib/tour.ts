export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export type TourTab = "market" | "proof" | "monday";

export type TourStep = {
  id: string;
  target?: string;
  title: string;
  body: string;
  value: string;
  placement?: TourPlacement;
  tab?: TourTab;
};

export const LANDING_TOUR: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Sutra",
    body: "Changing your career is a full time job. Automation lets you apply more and fail more. Sutra is quality at scale: the hard targeting and customizing, not another spray.",
    value: "We bring both: the speed of automation, and applications aimed at jobs where you actually have a chance.",
    placement: "center",
  },
  {
    id: "hero",
    target: "landing-hero",
    title: "What Sutra is for",
    body: "Read the four lines. Automation is the easy part — and it mostly helps you fail more. Research, customizing, and targeting jobs you can actually win is still the grind. That is what Sutra does.",
    value: "Quality at scale, not more applications.",
    placement: "bottom",
  },
  {
    id: "demo",
    target: "landing-demo",
    title: "See it with Ana’s file",
    body: "Opens Studio as Ana: NestJS, Belgrade, August layoff. Agents run so you can inspect sandbox proof, a tailored CV of her full work history, and a pitch before you type.",
    value: "Fastest way to see artefacts tied to a real listing without filling a form.",
    placement: "bottom",
  },
  {
    id: "own",
    target: "landing-own",
    title: "Use your own details",
    body: "Skip Ana. A short setup asks for your CV, then a few clicks: situation, market, city, what you want next. We draft every job from the file before agents run.",
    value: "Proof and the tailored CV only match you if the dossier is yours. Samples are for orientation; this is for Monday.",
    placement: "bottom",
  },
  {
    id: "path",
    target: "landing-path",
    title: "What you can send",
    body: "Your file → a real listing → sandbox proof → a CV for that role and a pitch. Those cards are the whole product — nothing else is hiding in the nav.",
    value: "If you know these cards, you know what you can send — not how many jobs you autofilled.",
    placement: "top",
  },
  {
    id: "partners",
    target: "landing-partners",
    title: "What runs when you click",
    body: "Grok writes your summary, Exa searches, Firecrawl scrapes listings, Daytona scores and writes code. You do not pick tools.",
    value: "If a key is missing, a fallback still keeps your run moving so you are not stuck on a blank screen.",
    placement: "top",
  },
];

export const STUDIO_TOUR: TourStep[] = [
  {
    id: "studio",
    title: "This is the working surface",
    body: "Left: who you are. Center: what the agents did. Right: the coach that cuts fluff.",
    value: "Everything after Run exists so you can send work, not a status update.",
    placement: "center",
  },
  {
    id: "presets",
    target: "studio-presets",
    title: "Try a sample person",
    body: "Ana (layoff), Luka (student), Marija (PM). Click one to load a dossier and immediately run the agents.",
    value: "Useful if you want to see a finished pack first. Each sample changes the proof template, not just the name.",
    placement: "right",
  },
  {
    id: "dossier",
    target: "studio-dossier",
    title: "Your dossier",
    body: "First time, a wizard walks you through the CV and a few qualifying questions. After that you can still edit name, skills, and every role. A photo is optional for the CV headshot. Situation and target steer which jobs Exa hunts.",
    value: "Garbage in, garbage out. Specific skills and a real city beat a vague “open to work”.",
    placement: "right",
  },
  {
    id: "save",
    target: "studio-save",
    title: "Your file is saved",
    body: "Refresh or come back later — dossier, last run, and tailored-CV notes stay with this browser (or Sutra cloud if the operator enabled Convex).",
    value: "You are not starting from a blank form every time you open Studio.",
    placement: "bottom",
  },
  {
    id: "run",
    target: "studio-run",
    title: "Run agents",
    body: "One click starts the chain: Grok summary, Exa search, Firecrawl scrape, Daytona sandbox.",
    value: "You do not pick tools. Watch the list to see what actually ran on your file.",
    placement: "bottom",
  },
  {
    id: "trace",
    target: "studio-trace",
    title: "What ran",
    body: "Each partner row is a billed API (Grok, Exa, Firecrawl, Daytona). Live means a real key answered. Offline means a curated fallback kept the path moving.",
    value: "If a step stalled, this list tells you which partner failed — so you know whether to rerun or wait.",
    placement: "right",
  },
  {
    id: "daytona",
    target: "studio-daytona",
    title: "Daytona sandbox",
    body: "The sandbox scores listings against your skills and writes the 48-hour proof files. Logs stream here as the VM works.",
    value: "Fit scores and proof code come from execution, not a prompt that “sounds technical”.",
    placement: "top",
  },
  {
    id: "market",
    target: "studio-tabs",
    title: "Market tab",
    body: "Live Exa listings (or the catalog if search is down), ranked by sandbox fit. Open the URL — these are real postings when Exa is live.",
    value: "You are not browsing a job board. You are looking at roles already scored against your dossier.",
    placement: "bottom",
    tab: "market",
  },
  {
    id: "onepager",
    target: "studio-onepager",
    title: "CV for this role",
    body: "Each listing gets a one-page CV built from every job on your uploaded file, rewritten for that role. Open it, Save PDF, then Email listing or Email draft (or Gmail). mailto cannot attach the PDF — attach the file you saved. Sutra does not send mail.",
    value: "Hiring managers print one page. This is your CV for this posting, not a Sutra scorecard.",
    placement: "left",
    tab: "market",
  },
  {
    id: "proof",
    target: "studio-tabs",
    title: "Proof of work",
    body: "A 48-hour project: hook, how to walk someone through it, and files you can copy into a repo. Switch files with the chips.",
    value: "This is the artefact you attach to the email. A public README beats ten years of “responsible for”.",
    placement: "bottom",
    tab: "proof",
  },
  {
    id: "monday",
    target: "studio-tabs",
    title: "Monday pack",
    body: "Seven days of concrete hours, plus an intro and STAR you can say out loud. No “network more”.",
    value: "The week closes with an act — a conversation or a submit — not another plan.",
    placement: "bottom",
    tab: "monday",
  },
  {
    id: "pitch",
    target: "studio-pitch",
    title: "Pitch coach",
    body: "Type or speak an intro. Score it. Grok (or the local coach) cuts LinkedIn sludge and hands you a slower rewrite.",
    value: "Rehearsal in the product, not in the shower. Say it once here so Monday is boring.",
    placement: "left",
  },
];
