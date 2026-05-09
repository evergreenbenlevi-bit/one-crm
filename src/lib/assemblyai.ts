/**
 * AssemblyAI client — video transcription
 * Accepts a direct video URL (e.g. from lobstr.io) and returns transcript text.
 * Instagram CDN URLs are valid for 24-48h — transcribe in the same pipeline run.
 *
 * Pricing: ~$0.37/hr audio. A 45s reel = ~$0.005. Practically free at this scale.
 * Poll: every 3s, max 90s timeout.
 */

const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
const BASE = "https://api.assemblyai.com";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function transcribeVideo(
  videoUrl: string
): Promise<string | null> {
  if (!ASSEMBLYAI_KEY) {
    console.warn("[assemblyai] ASSEMBLYAI_API_KEY not set — skipping");
    return null;
  }

  try {
    const submit = await fetch(`${BASE}/v2/transcript`, {
      method: "POST",
      headers: {
        Authorization: ASSEMBLYAI_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: videoUrl,
        speech_models: ["universal-3-pro"],
        language_detection: true,
      }),
    });

    if (!submit.ok) {
      console.warn(`[assemblyai] submit failed: ${submit.status}`);
      return null;
    }

    const job = (await submit.json()) as { id: string; status: string };
    if (!job.id) {
      console.warn("[assemblyai] no job id in response");
      return null;
    }

    // Poll until completed or error (max 90s)
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await sleep(3000);
      const poll = await fetch(`${BASE}/v2/transcript/${job.id}`, {
        headers: { Authorization: ASSEMBLYAI_KEY },
      });
      const result = (await poll.json()) as {
        status: string;
        text?: string;
        error?: string;
      };
      if (result.status === "completed") return result.text ?? null;
      if (result.status === "error") {
        console.warn(`[assemblyai] error: ${result.error ?? "unknown"}`);
        return null;
      }
    }

    console.warn(`[assemblyai] timeout for ${videoUrl.slice(0, 80)}`);
    return null;
  } catch (err) {
    console.warn("[assemblyai] exception:", err);
    return null;
  }
}
