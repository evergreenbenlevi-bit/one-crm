// Parse agent .md files — extract YAML frontmatter (name, description, model, tools, color)

export interface ParsedAgent {
  slug: string;
  name: string;
  description: string;
  model: string | null;
  tools: string[];
  color: string | null;
  file_path: string;
}

export function parseAgentMd(content: string, filePath: string): ParsedAgent | null {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];

  const getName = (s: string) => {
    const m = s.match(/^name:\s*(.+)$/m);
    return m ? m[1].trim() : null;
  };

  const getModel = (s: string) => {
    const m = s.match(/^model:\s*(.+)$/m);
    return m ? m[1].trim() : null;
  };

  const getColor = (s: string) => {
    const m = s.match(/^color:\s*(.+)$/m);
    return m ? m[1].trim() : null;
  };

  const getDescription = (s: string) => {
    // Single-line: description: "text"
    const single = s.match(/^description:\s*["']?([^"'\n]+)["']?\s*$/m);
    if (single) return single[1].trim();

    // Multi-line: description: >\n  text\n  text
    const multi = s.match(/^description:\s*[>|]\n([\s\S]*?)(?=\n\w|\n---)/m);
    if (multi) return multi[1].replace(/\n\s*/g, " ").trim();

    return "";
  };

  const getTools = (s: string): string[] => {
    const toolsMatch = s.match(/^tools:\n((?:\s+-\s+.+\n?)*)/m);
    if (!toolsMatch) return [];
    return toolsMatch[1]
      .split("\n")
      .map((l) => l.replace(/^\s+-\s+/, "").trim())
      .filter(Boolean);
  };

  const slug = filePath.split("/").pop()?.replace(/\.md$/, "") || "";
  const name = getName(fm) || slug;

  return {
    slug,
    name,
    description: getDescription(fm),
    model: getModel(fm),
    tools: getTools(fm),
    color: getColor(fm),
    file_path: filePath,
  };
}
