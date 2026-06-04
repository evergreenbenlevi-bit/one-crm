/**
 * powerdoc.ts
 * PowerDoc EOT (External One-Time Form) e-signing — server-side only.
 *
 * Sends a self-generated contract PDF for signing WITHOUT a saved PowerDoc
 * template, by POSTing the base64 PDF + a hardcoded field-geometry array to
 * `/api/v1/submission/onetime/send`. Because EDEN-CRM generates its own PDF
 * (see contract-pdf.tsx), we control the layout → we know the signature coords.
 *
 * Field geometry SSOT: src/lib/contract-signature-layout.ts
 * API ref: https://docs.powerdoc.co.il/API%20Methods/send-submission-from-pdf-EOT.html
 *
 * Each successful send consumes 1 PowerDoc submission credit.
 */

import {
  SIGNATURE_FIELD,
  SIGNATURE_DATE_FIELD,
  toPowerDocPct,
  type PowerDocPosition,
} from "./contract-signature-layout";

const BASE_URL = "https://extapi.powerdoc.co";
const EOT_SEND_PATH = "/api/v1/submission/onetime/send";

/** PowerDoc error code returned when the account has no send credits left. */
export const PD_NO_SEND_AMOUNT = 4097002;

/**
 * Thrown when PowerDoc rejects a send because the subscription has no send
 * amount left (error 4097002). Distinct from generic send failures so the
 * caller can alert Ben to refill instead of failing a real client silently.
 */
export class PowerDocQuotaExhaustedError extends Error {
  readonly code = PD_NO_SEND_AMOUNT;
  constructor(detail?: string) {
    super(
      `PowerDoc send quota exhausted (4097002) — refill send-amount at app.powerdoc.co${
        detail ? ` · ${detail}` : ""
      }`,
    );
    this.name = "PowerDocQuotaExhaustedError";
  }
}

/** Default page count of the EDEN ambassador contract (contract-pdf.tsx renders 8 explicit pages). */
const CONTRACT_DEFAULT_PAGES = 8;

interface PowerDocArea {
  id: number;
  displayName: string;
  value: string | null;
  declaration: unknown;
  must: boolean;
  forAccountOnly: boolean;
  description: string;
  visible: boolean;
  type: "Signature" | "Date" | "TextBox" | "CheckBox" | "Photo" | "Label" | "DropDownList";
  typeString: null;
  priority: number;
  position: PowerDocPosition;
  validationPattern: string;
  min: number;
  max: number;
  textSettings: {
    fontSize: null;
    fontAlignment: null;
    bold: null;
    italic: null;
    fontFamily: null;
    letterSpacing: null;
    bgColor: null;
    foreColor: null;
  };
  properties: unknown[];
  schema: string;
  copyFields: { copyFrom: number | null; copyTo: number[] };
}

const NULL_TEXT_SETTINGS = {
  fontSize: null,
  fontAlignment: null,
  bold: null,
  italic: null,
  fontFamily: null,
  letterSpacing: null,
  bgColor: null,
  foreColor: null,
} as const;

function creds(): { key: string; token: string } {
  const key = process.env.POWERDOC_API_KEY;
  const token = process.env.POWERDOC_ACCOUNT_TOKEN;
  if (!key || !token) {
    throw new Error("PowerDoc creds missing: set POWERDOC_API_KEY and POWERDOC_ACCOUNT_TOKEN");
  }
  return { key, token };
}

/** Count physical pages in a PDF buffer (pdfkit/react-pdf output). Falls back to the contract default. */
export function countPdfPages(pdf: Buffer): number {
  const txt = pdf.toString("latin1");
  const matches = txt.match(/\/Type\s*\/Page(?![s/])/g);
  const n = matches ? matches.length : 0;
  return n > 0 ? n : CONTRACT_DEFAULT_PAGES;
}

/**
 * Build the client-facing signature + date areas for the EOT submission.
 * IDs start at 10000 (PowerDoc requires the 10000–19999 range for EOT areas).
 */
export function buildContractAreas(): PowerDocArea[] {
  const sig = toPowerDocPct(SIGNATURE_FIELD);
  const date = toPowerDocPct(SIGNATURE_DATE_FIELD);
  return [
    {
      id: 10000,
      displayName: "חתימת הלקוח",
      value: null, // Signature value MUST be null
      declaration: null,
      must: true,
      forAccountOnly: false, // client fills
      description: "",
      visible: false, // mirrors proven EDEN template + official sample
      type: "Signature",
      typeString: null,
      priority: 1,
      position: sig,
      validationPattern: "None",
      min: 0,
      max: 0,
      textSettings: { ...NULL_TEXT_SETTINGS },
      properties: [],
      schema: "",
      copyFields: { copyFrom: null, copyTo: [] },
    },
    {
      id: 10001,
      displayName: "תאריך חתימה",
      value: "#today#", // auto-stamped by PowerDoc on signing
      declaration: null,
      must: false,
      forAccountOnly: true, // sender/auto filled
      description: "",
      visible: true,
      type: "Date",
      typeString: null,
      priority: 2,
      position: date,
      validationPattern: "None",
      min: 0,
      max: 0,
      textSettings: { ...NULL_TEXT_SETTINGS },
      properties: [],
      schema: "",
      copyFields: { copyFrom: null, copyTo: [] },
    },
  ];
}

export interface SendContractParams {
  pdfBuffer: Buffer;
  clientName: string;
  email: string;
  phone?: string | null;
  /** Reference id stored on the PowerDoc submission (e.g. proposal id). */
  externalId?: string;
  /** Message shown in the email/SMS with the signing link. */
  message?: string;
  /** Welcome message shown before the form opens. */
  description?: string;
  /** Override the signature page index (0-based). Defaults to last page of the PDF. */
  signaturePageIndex?: number;
}

export interface SendContractResult {
  signingUrl: string;
  submissionId: string;
}

/**
 * Send a contract PDF for one-time e-signing via PowerDoc EOT.
 * Returns the signing URL (to store + redirect the client to) and submission id.
 * Throws on missing creds, API error, or empty result.
 */
export async function sendContractForSigning(
  params: SendContractParams,
): Promise<SendContractResult> {
  const { key, token } = creds();

  const pageIndex =
    params.signaturePageIndex ?? countPdfPages(params.pdfBuffer) - 1;

  const submission = {
    clientName: params.clientName,
    externalID: params.externalId ?? "",
    phone: params.phone ?? null,
    email: params.email,
    target: "Email",
    language: "he",
    allowSend: true,
    message: params.message ?? "הסכם EDEN שגרירים מוכן לחתימתך",
    description: params.description ?? "אנא עיין/י בהסכם וחתום/חתמי בתחתית המסמך.",
    emailNotification: null,
    isSaveDisplay: true,
    isActive: true,
    pages: [
      {
        id: pageIndex,
        image: "string", // placeholder — page image comes from contentBase64
        areas: buildContractAreas(),
      },
    ],
  };

  const body = {
    submission,
    extension: "PDF",
    contentBase64: params.pdfBuffer.toString("base64"),
  };

  const res = await fetch(`${BASE_URL}${EOT_SEND_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key};${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    result?: string;
    submissionId?: string;
    error?: number;
    errorMessage?: string;
  };

  if (json.error === PD_NO_SEND_AMOUNT) {
    throw new PowerDocQuotaExhaustedError(json.errorMessage);
  }

  if (!res.ok || (json.error && json.error !== 0) || !json.result) {
    throw new Error(
      `PowerDoc EOT send failed (${res.status}): ${
        json.errorMessage || JSON.stringify(json).slice(0, 200)
      }`,
    );
  }

  return { signingUrl: json.result, submissionId: json.submissionId ?? "" };
}
