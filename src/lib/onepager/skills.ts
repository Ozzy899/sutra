const ALIASES: Record<string, string[]> = {
  "node.js": ["node", "nodejs", "nestjs", "express", "fastify"],
  nodejs: ["node.js", "node", "nestjs"],
  node: ["node.js", "nodejs", "nestjs"],
  nestjs: ["nest", "node.js", "nodejs", "node", "typescript"],
  nest: ["nestjs"],
  postgresql: ["postgres", "psql"],
  postgres: ["postgresql", "psql"],
  typescript: ["ts", "nestjs"],
  javascript: ["js", "node.js"],
  react: ["react.js", "reactjs"],
  "next.js": ["nextjs", "next", "react"],
  nextjs: ["next.js", "next"],
  aws: ["amazon web services"],
  kubernetes: ["k8s"],
  k8s: ["kubernetes"],
};

const LANGUAGE = new Set([
  "typescript",
  "javascript",
  "python",
  "java",
  "go",
  "golang",
  "sql",
  "php",
  "ruby",
  "kotlin",
  "swift",
  "c#",
  "c++",
  "html",
  "css",
  "scss",
  "rust",
  "scala",
]);

const FRAMEWORK = new Set([
  "nestjs",
  "react",
  "vue",
  "angular",
  "svelte",
  "node.js",
  "node",
  "nodejs",
  "next.js",
  "next",
  "express",
  "fastify",
  "django",
  "flask",
  "spring",
  "tailwind",
  "graphql",
  "prisma",
  "typeorm",
  "kafka",
  "postgresql",
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "aws",
  "gcp",
  "azure",
  "docker",
  "kubernetes",
  "k8s",
  "opentelemetry",
  "solana",
]);

const PRODUCT = new Set([
  "discovery",
  "specs",
  "gtm",
  "figma",
  "analytics",
  "experimentation",
  "ai workflows",
  "llm tooling",
  "agents",
  "product",
]);

export type SkillGroup = {
  label: string;
  items: string[];
};

export function normalizeSkill(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function uniqueSkills(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = normalizeSkill(raw);
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function expand(term: string): string[] {
  const q = term.toLowerCase();
  return [q, ...(ALIASES[q] ?? [])];
}

export function skillMatches(skill: string, haystack: string[]): boolean {
  const variants = expand(skill);
  const hay = haystack.flatMap(expand);
  return variants.some((v) => hay.some((h) => h.includes(v) || v.includes(h)));
}

export function overlapSkills(skills: string[], stack: string[]): string[] {
  return uniqueSkills(skills.filter((s) => skillMatches(s, stack)));
}

function bucketOf(skill: string): "languages" | "frameworks" | "product" | "tools" {
  const q = skill.toLowerCase();
  if (LANGUAGE.has(q)) return "languages";
  if (FRAMEWORK.has(q)) return "frameworks";
  if (PRODUCT.has(q)) return "product";
  return "tools";
}

const GROUP_LABEL: Record<ReturnType<typeof bucketOf>, string> = {
  languages: "Languages",
  frameworks: "Frameworks & systems",
  product: "Product",
  tools: "Tools",
};

/** JD-overlapping skills first inside each group. Empty groups omitted. */
export function groupSkills(skills: string[], jobStack: string[]): SkillGroup[] {
  const matched = new Set(overlapSkills(skills, jobStack).map((s) => s.toLowerCase()));
  const buckets: Record<ReturnType<typeof bucketOf>, string[]> = {
    languages: [],
    frameworks: [],
    product: [],
    tools: [],
  };
  for (const skill of uniqueSkills(skills)) {
    buckets[bucketOf(skill)].push(skill);
  }
  const order: Array<ReturnType<typeof bucketOf>> = ["frameworks", "languages", "product", "tools"];
  const groups: SkillGroup[] = [];
  for (const key of order) {
    const items = [...buckets[key]].sort((a, b) => {
      const am = matched.has(a.toLowerCase()) ? 0 : 1;
      const bm = matched.has(b.toLowerCase()) ? 0 : 1;
      return am - bm;
    });
    if (items.length) groups.push({ label: GROUP_LABEL[key], items });
  }
  return groups;
}

function overlapFirst(items: string[], jobStack: string[]): string[] {
  const matched = new Set(overlapSkills(items, jobStack).map((s) => s.toLowerCase()));
  return uniqueSkills(items).sort((a, b) => {
    const am = matched.has(a.toLowerCase()) ? 0 : 1;
    const bm = matched.has(b.toLowerCase()) ? 0 : 1;
    return am - bm;
  });
}

/** Tech skills + tools for the one-pager band. JD overlap first. Human languages stay separate. */
export function pageStackGroups(
  skills: string[],
  tools: string[],
  jobStack: string[],
): SkillGroup[] {
  const groups: SkillGroup[] = [];
  const skillItems = overlapFirst(skills, jobStack);
  const toolItems = overlapFirst(tools, jobStack);
  if (skillItems.length) groups.push({ label: "Skills", items: skillItems });
  if (toolItems.length) groups.push({ label: "Tools", items: toolItems });
  return groups;
}

