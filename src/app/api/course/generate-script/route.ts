import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are the ONE™ Course Copywriter. You write course scripts for Ben Levi and Avitar's coaching program.

RULES:
- Write in native Hebrew (think in Hebrew, don't translate from English)
- Direct, conversational tone — like talking to a friend
- Replace ALL of Tom Young's personal stories with generic examples
- Keep the teaching methodology and frameworks — change the packaging
- Use English terms naturally where Israelis would (Framework, Flywheel, Avatar, CTA)
- Every script ends with a clear CTA (open playbook, do exercise, watch next)
- Length: 600-1200 words depending on module complexity
- Format: clear headers (##), short paragraphs, bullet points where needed
- NEVER use these phrases: בהחלט, ניתן לראות כי, על מנת ל, אשמח לסייע, באופן כללי, יש לציין כי
- Sound like Ben: confident, direct, zero fluff, slightly provocative

STRUCTURE:
1. Hook — why this matters NOW
2. Core teaching — the framework/concept
3. Practical application — what to do with this
4. CTA — specific next action`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moduleName, moduleNumber, description, clientBenefit, tomTranscript, source } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let userPrompt = `Write a course script for module ${moduleNumber}: "${moduleName}"`;
    if (description) userPrompt += `\n\nModule description: ${description}`;
    if (clientBenefit) userPrompt += `\nClient benefit: ${clientBenefit}`;

    if (tomTranscript && (source === "tom" || source === "tom_modified")) {
      userPrompt += `\n\n--- TOM'S ORIGINAL TRANSCRIPT (use as source material, rewrite in ONE™ voice) ---\n${tomTranscript}`;
    }

    userPrompt += `\n\n--- INSTRUCTIONS ---
Write the ONE™ version of this script. Keep the core teaching. Remove Tom's personal stories. Write in Ben's voice (Hebrew, direct, confident). Output ONLY the script text, no meta-commentary.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const script = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map(block => block.text)
      .join("\n");

    return NextResponse.json({ script });
  } catch (error) {
    console.error("Generate script error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate script" },
      { status: 500 }
    );
  }
}
