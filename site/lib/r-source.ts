import "server-only";
import fs from "node:fs";
import path from "node:path";

export type RSection = { id: string; title: string; code: string };

/** Split analysis.R on its `# ---- N. title ----` markers. Read at build time.
 *  analysis.R copies itself into site/data so the site builds on its own (Vercel). */
export function readRSections(): { full: string; sections: RSection[] } {
  const file = path.join(process.cwd(), "data", "analysis.R");
  const full = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const parts = full.split(/^# ---- (.+?) -+\s*$/m);
  const sections: RSection[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    const id = title.split(".")[0].trim();
    sections.push({ id, title, code: `# ---- ${title}\n${parts[i + 1].replace(/^\n+|\n+$/g, "")}` });
  }
  return { full, sections };
}
