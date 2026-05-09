const DOCUSEAL_URL = process.env.DOCUSEAL_URL!;
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!;
const DOCUSEAL_TEMPLATE_ID = process.env.DOCUSEAL_TEMPLATE_ID!;

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
  const docUrl = sub.documents?.[0]?.url;
  if (!docUrl) throw new Error("No signed document URL in submission");

  const res = await fetch(docUrl);
  if (!res.ok) throw new Error(`Failed to download signed PDF: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
