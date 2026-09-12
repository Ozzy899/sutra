export const FAMILIES = [
  "design",
  "pm",
  "data",
  "mobile",
  "qa",
  "devops",
  "web3",
  "frontend",
  "backend",
  "fullstack",
  "general",
] as const;

export type RoleFamily = (typeof FAMILIES)[number];

const PATTERNS: [RoleFamily, RegExp][] = [
  ["design", /dizajn|designer|design lead|product design|ux|ui\/ux|\bui\b|figma|visual design|brand/i],
  ["pm", /product manager|\bpm\b|product owner|discovery|roadmap|gtm|menadžer proizvod|menadzer proizvod|fractional product|ai product|delivery manager|engineering manager|program manager|project manager|delivery lead|team lead|tech lead/i],
  ["data", /data sci|data eng|machine learning|\bml\b|\bnlp\b|analyst|analitič|pytorch|spark|warehouse/i],
  ["mobile", /ios|android|flutter|react native|kotlin|swift|\bmobile\b/i],
  ["qa", /\bqa\b|test engineer|quality ass|automation test|sdet/i],
  ["web3", /web3|solana|blockchain|smart contract|crypto|defi/i],
  ["devops", /devops|\bsre\b|kubernetes|\bk8s\b|observability|platform ops|infra engineer/i],
  ["frontend", /frontend|front-end|front end|react|vue|next\.?js|tailwind|css/i],
  ["backend", /backend|back-end|back end|nestjs|nest\.js|\bjava\b|\.net|kafka|postgres|golang|\brust\b|platform engineer|api engineer/i],
  ["fullstack", /full.?stack|full stack/i],
];

export function detectFamily(text: string): RoleFamily {
  const blob = text.trim();
  if (!blob) return "general";
  for (const [family, re] of PATTERNS) {
    if (re.test(blob)) return family;
  }
  return "general";
}

export function profileFamily(profile: {
  lastRole: string;
  skills: string[];
  bio?: string;
}): RoleFamily {
  const fromRole = detectFamily(profile.lastRole);
  if (fromRole !== "general") return fromRole;
  const fromSkills = detectFamily(profile.skills.join(" "));
  if (fromSkills !== "general") return fromSkills;
  return detectFamily(profile.bio ?? "");
}

export function jobFamily(job: { title: string; stack: string[]; snippet: string }): RoleFamily {
  const primary = detectFamily(`${job.title} ${job.stack.join(" ")}`);
  if (primary !== "general") return primary;
  return detectFamily(job.snippet);
}

const NEIGHBORS: Record<RoleFamily, RoleFamily[]> = {
  design: ["frontend", "pm"],
  pm: ["design", "fullstack"],
  data: ["backend", "qa"],
  mobile: ["frontend", "fullstack"],
  qa: ["backend", "frontend"],
  devops: ["backend", "fullstack"],
  web3: ["backend", "fullstack"],
  frontend: ["fullstack", "design", "mobile"],
  backend: ["fullstack", "devops", "web3"],
  fullstack: ["frontend", "backend"],
  general: [],
};

export function familyAffinity(profile: RoleFamily, job: RoleFamily): number {
  if (profile === "general") return 0.35;
  if (profile === job) return 1;
  if (NEIGHBORS[profile].includes(job)) return 0.45;
  return 0.05;
}

export function familyLabel(family: RoleFamily): string {
  const map: Record<RoleFamily, string> = {
    design: "design",
    pm: "product",
    data: "data/ML",
    mobile: "mobile",
    qa: "QA",
    devops: "SRE/devops",
    web3: "web3",
    frontend: "frontend",
    backend: "backend",
    fullstack: "full-stack",
    general: "generalist",
  };
  return map[family];
}
