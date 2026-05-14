const DOCUSEAL_URL = process.env.DOCUSEAL_URL!.trim();
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!;
const DOCUSEAL_TEMPLATE_ID = process.env.DOCUSEAL_TEMPLATE_ID!;

// ── Types ─────────────────────────────────────────────────────────────────────

// DocuSeal POST /api/submissions returns an array of submitter objects directly
interface SubmitterResponse {
  id: number;
  slug: string;
  submission_id: number;
  email: string;
  name: string;
  status: string;
  embed_src: string;
  completed_at?: string;
  ip?: string;
  ua?: string;
}

interface Submission {
  id: number;
  slug: string;
  status: string;
  submitters: Array<SubmitterResponse>;
  documents?: Array<{ url: string }>;
}

export async function createSubmission(
  proposalId: string,
  signerEmail: string,
  signerName: string,
  templateId = DOCUSEAL_TEMPLATE_ID,
  prefillValues?: Record<string, string>,
): Promise<{ submissionId: string; signingUrl: string }> {
  const res = await fetch(`${DOCUSEAL_URL}/api/submissions`, {
    method: "POST",
    headers: {
      "X-Auth-Token": DOCUSEAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: Number(templateId),
      submitters: [
        {
          role: "First Party",
          email: signerEmail,
          name: signerName,
          metadata: { proposal_id: proposalId },
          preferences: { send_email: false },
          ...(prefillValues ? { values: prefillValues } : {}),
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSeal createSubmission failed: ${res.status} ${err}`);
  }

  // DocuSeal returns array of submitters directly (not a submission wrapper)
  const data = (await res.json()) as SubmitterResponse[];
  const submitter = Array.isArray(data) ? data[0] : data;

  return {
    submissionId: String(submitter.submission_id),
    signingUrl: `${DOCUSEAL_URL}/s/${submitter.slug}`,
  };
}

export async function getSubmission(submissionId: string): Promise<Submission> {
  const res = await fetch(`${DOCUSEAL_URL}/api/submissions/${submissionId}`, {
    headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
  });
  if (!res.ok) throw new Error(`DocuSeal getSubmission failed: ${res.status}`);
  return res.json() as Promise<Submission>;
}

export async function downloadSignedPDF(submissionId: string): Promise<Buffer> {
  const sub = await getSubmission(submissionId);
  let docUrl = sub.documents?.[0]?.url;
  if (!docUrl) throw new Error("No signed document URL in submission");

  // DocuSeal CE returns localhost URLs — rewrite to public base URL
  docUrl = docUrl.replace(/^https?:\/\/localhost:\d+/, DOCUSEAL_URL);

  const res = await fetch(docUrl);
  if (!res.ok) throw new Error(`Failed to download signed PDF: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Update DocuSeal template 2 with a new PDF document from a public URL.
 * Uses PUT /api/templates/:id with base64-encoded document.
 * Returns the template ID (always 2 — we reuse the single template slot).
 *
 * NOTE: DocuSeal CE does not support POST /api/templates (Pro only).
 * Strategy: we have one "dynamic" template slot (ID=2). Before each signing,
 * we update its document to the freshly-generated client-specific PDF.
 * This means only one signing flow can be active at once — acceptable for
 * the current volume. If concurrent signings become needed, upgrade to Pro.
 */
export async function updateTemplateDocument(
  pdfBuffer: Buffer,
  proposalId: string,
): Promise<number> {
  const base64 = pdfBuffer.toString("base64");

  const res = await fetch(`${DOCUSEAL_URL}/api/templates/${DOCUSEAL_TEMPLATE_ID}`, {
    method: "PUT",
    headers: {
      "X-Auth-Token": DOCUSEAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `contract-template`,
      documents: [
        {
          name: `contract-${proposalId}.pdf`,
          base64,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSeal updateTemplate failed: ${res.status} ${err}`);
  }

  await res.json(); // consume response body

  // GET template to retrieve attachment_uuid — PUT returns only {id, updated_at}
  const templateRes = await fetch(`${DOCUSEAL_URL}/api/templates/${DOCUSEAL_TEMPLATE_ID}`, {
    headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
  });
  const templateData = await templateRes.json() as { schema?: Array<{ attachment_uuid: string }> };
  const attachmentUuid = templateData.schema?.[0]?.attachment_uuid;

  // Re-position signature field — attachment_uuid links field to document in DB index
  const fieldRes = await fetch(`${DOCUSEAL_URL}/api/templates/${DOCUSEAL_TEMPLATE_ID}`, {
    method: "PUT",
    headers: {
      "X-Auth-Token": DOCUSEAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: [
        {
          name: "חתימה",
          type: "signature",
          required: true,
          submitter_uuid: "d9ecc61f-54d7-4549-b3d0-2be01f3500a5",
          areas: [{ x: 0.08, y: 0.50, w: 0.85, h: 0.20, page: 8, attachment_uuid: attachmentUuid }],
        },
      ],
    }),
  });

  if (!fieldRes.ok) {
    const err = await fieldRes.text();
    console.warn(`DocuSeal field reposition warning: ${fieldRes.status} ${err}`);
    // Non-fatal — continue
  }

  return Number(DOCUSEAL_TEMPLATE_ID);
}
