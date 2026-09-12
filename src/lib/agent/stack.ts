/** Skills (tech), human languages, and tools taken from a CV. Never invent. */

export type CvStack = {
  skills: string[];
  languages: string[];
  tools: string[];
};

const HUMAN_LANGUAGES = [
  "English",
  "Serbian",
  "Serbo-Croatian",
  "Croatian",
  "Bosnian",
  "Montenegrin",
  "German",
  "French",
  "Spanish",
  "Italian",
  "Portuguese",
  "Russian",
  "Ukrainian",
  "Polish",
  "Czech",
  "Slovak",
  "Hungarian",
  "Romanian",
  "Bulgarian",
  "Macedonian",
  "Slovenian",
  "Greek",
  "Turkish",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Arabic",
  "Hebrew",
  "Hindi",
  "Chinese",
  "Mandarin",
  "Japanese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Malay",
  "Catalan",
  "Albanian",
  "Latin",
];

const TECH_SKILLS = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Golang",
  "Rust",
  "Java",
  "Kotlin",
  "Swift",
  "PHP",
  "Ruby",
  "Scala",
  "C#",
  "C++",
  "SQL",
  "HTML",
  "CSS",
  "SCSS",
  "React",
  "Next.js",
  "Vue",
  "Angular",
  "Svelte",
  "Node.js",
  "NestJS",
  "Express",
  "Fastify",
  "Django",
  "Flask",
  "Spring",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Kafka",
  "GraphQL",
  "Prisma",
  "TypeORM",
  "Tailwind",
  "PyTorch",
  "TensorFlow",
  "Spark",
  "Solana",
  "OpenTelemetry",
];

const TOOL_NAMES = [
  "Figma",
  "Jira",
  "Excel",
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "Git",
  "GitHub",
  "GitLab",
  "Bitbucket",
  "Notion",
  "Slack",
  "Trello",
  "Linear",
  "Confluence",
  "Tableau",
  "Power BI",
  "Photoshop",
  "Illustrator",
  "Miro",
  "Postman",
  "Jenkins",
  "Terraform",
  "Linux",
  "Google Sheets",
  "Sheets",
  "Salesforce",
  "HubSpot",
  "Asana",
  "ClickUp",
  "Datadog",
  "Grafana",
  "Sentry",
  "Vercel",
  "Netlify",
  "Heroku",
  "Firebase",
  "Cloudflare",
  "Word",
  "PowerPoint",
  "Outlook",
  "Teams",
  "Zoom",
  "Looker",
  "Mixpanel",
  "Amplitude",
  "GA4",
  "Google Analytics",
  "Hotjar",
  "Webflow",
  "Sketch",
  "InVision",
  "Canva",
  "Cursor",
  "VS Code",
  "IntelliJ",
  "Xcode",
  "Android Studio",
];

const TOOL_SET = new Set(TOOL_NAMES.map((s) => s.toLowerCase()));
const HUMAN_SET = new Set(HUMAN_LANGUAGES.map((s) => s.toLowerCase()));

export function uniqueLabels(items: string[], max = 24, maxLen = 48): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = String(raw)
      .replace(/^[#•\-\d.)\s]+/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!s || s.length > maxLen) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

export function attestedLabels(items: string[] | undefined, source: string): string[] {
  if (!items?.length) return [];
  const hay = source.toLowerCase();
  return uniqueLabels(items).filter((item) => labelInSource(item, hay));
}

function labelInSource(item: string, hay: string): boolean {
  const q = item.toLowerCase().trim();
  if (!q) return false;
  const core = q.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (core.length >= 2 && hay.includes(core)) return true;
  const first = core.split(/[/,;|]/)[0]?.trim() ?? "";
  return first.length >= 2 && hay.includes(first);
}

function section(text: string, ...heads: string[]): string {
  const re = new RegExp(
    `(?:^|\\n)#{0,3}\\s*(?:${heads.join("|")})\\b[:\\s]*\\n([\\s\\S]*?)(?=\\n#{1,3}\\s+\\S|\\n(?:experience|education|skills|about|summary|languages|tools|interests)\\b|$)`,
    "i",
  );
  return text.match(re)?.[1]?.trim() ?? "";
}

function splitTokens(block: string): string[] {
  return block
    .split(/[,;\n|/•·]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1 && s.length < 48);
}

const AMBIGUOUS_CASE = new Set(["go", "git", "word", "teams", "sheets", "outlook", "canva", "linear"]);

function findKnown(text: string, names: string[]): string[] {
  const found: string[] = [];
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sensitive = AMBIGUOUS_CASE.has(name.toLowerCase());
    const re = new RegExp(`(?:^|[^\\p{L}])${escaped}(?:[^\\p{L}]|$)`, sensitive ? "u" : "iu");
    if (re.test(text)) found.push(name);
  }
  return found;
}

function looksHumanLanguage(token: string): boolean {
  const core = token.replace(/\s*\([^)]*\)\s*/g, " ").trim().toLowerCase();
  const head = (core.split(/[\s,;/+]+/)[0] ?? "").replace(/[-–—].*$/, "").trim();
  return HUMAN_SET.has(head);
}

function languageLabel(token: string): string | null {
  const t = token.replace(/\s+/g, " ").trim();
  if (!t || /[,;]/.test(t)) return null;
  if (!looksHumanLanguage(t)) return null;
  return t.slice(0, 48);
}

export function parseCvStack(text: string): CvStack {
  const skillBlock = section(text, "skills", "technical skills", "tech stack", "stack");
  const toolBlock = section(text, "tools", "tooling", "software");
  const langBlock = section(
    text,
    "languages",
    "language skills",
    "spoken languages",
    "jezik",
    "jezici",
  );

  const fromSkillBlock = skillBlock ? splitTokens(skillBlock) : [];
  const fromToolBlock = toolBlock ? splitTokens(toolBlock) : [];
  const fromLangBlock = langBlock ? splitTokens(langBlock).concat(langBlock.split(/\n/)) : [];

  const inlineLang = text.match(
    /(?:^|\n)\s*(?:languages?|jezici)\s*[:\-–]\s*([^\n]+)/i,
  )?.[1];
  if (inlineLang) fromLangBlock.push(...splitTokens(inlineLang));

  const languages = uniqueLabels(
    [...fromLangBlock.map(languageLabel).filter((s): s is string => Boolean(s))],
    10,
  );

  const scannedTech = findKnown(text, TECH_SKILLS);
  const scannedTools = findKnown(text, TOOL_NAMES);

  const rawSkills = uniqueLabels([...fromSkillBlock, ...scannedTech], 24);
  const rawTools = uniqueLabels([...fromToolBlock, ...scannedTools], 20);

  return partitionStack({ skills: rawSkills, tools: rawTools, languages });
}

export function partitionStack(stack: CvStack): CvStack {
  const languages = uniqueLabels(
    stack.languages.filter((s) => looksHumanLanguage(s)),
    10,
  );
  const langKeys = new Set(
    languages.map((s) => s.toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ").trim()),
  );
  const tools: string[] = [];
  const skills: string[] = [];
  const seen = new Set<string>();

  const push = (bucket: string[], raw: string) => {
    const s = raw.replace(/\s+/g, " ").trim();
    const key = s.toLowerCase();
    if (!s || seen.has(key) || langKeys.has(key)) return;
    seen.add(key);
    bucket.push(s);
  };

  for (const item of stack.tools) {
    if (TOOL_SET.has(item.toLowerCase())) push(tools, canonicalTool(item));
    else push(tools, item);
  }
  for (const item of stack.skills) {
    if (looksHumanLanguage(item)) continue;
    if (TOOL_SET.has(item.toLowerCase())) push(tools, canonicalTool(item));
    else push(skills, item);
  }

  return {
    skills: uniqueLabels(skills, 20),
    languages,
    tools: uniqueLabels(tools, 16),
  };
}

function canonicalTool(item: string): string {
  const q = item.toLowerCase();
  const hit = TOOL_NAMES.find((n) => n.toLowerCase() === q);
  return hit ?? item;
}

export function mergeCvStack(local: CvStack, grok: Partial<CvStack> | undefined, source: string): CvStack {
  return partitionStack({
    skills: uniqueLabels([...local.skills, ...attestedLabels(grok?.skills, source)], 24),
    languages: uniqueLabels(
      [...local.languages, ...attestedLabels(grok?.languages, source).filter((s) => looksHumanLanguage(s))],
      10,
    ),
    tools: uniqueLabels([...local.tools, ...attestedLabels(grok?.tools, source)], 20),
  });
}

export function coerceStringList(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    return uniqueLabels(raw.filter((s): s is string => typeof s === "string"));
  }
  if (typeof raw === "string" && raw.trim()) {
    return uniqueLabels(raw.split(/[,;|]/));
  }
  return undefined;
}
