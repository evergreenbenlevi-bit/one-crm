import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const SENDER_EMAIL = "evergreen.benlevi@gmail.com";
const SENDER_NAME = "Ben Levi";

function applyVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: "GMAIL_APP_PASSWORD not configured" }, { status: 500 });
  }

  const supabase = await createClient();

  // Get lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, name, email")
    .eq("id", id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (!lead.email) {
    return NextResponse.json({ error: "Lead has no email address" }, { status: 400 });
  }

  const body = await request.json();
  const { template_id, to, variables = {} } = body as {
    template_id: string;
    to?: string;
    variables?: Record<string, string>;
  };

  if (!template_id) {
    return NextResponse.json({ error: "template_id required" }, { status: 400 });
  }

  // Get template
  const { data: template, error: tmplError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", template_id)
    .single();

  if (tmplError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Build variable map — merge built-ins with caller-supplied
  const vars: Record<string, string> = {
    lead_name: lead.name,
    sender_name: SENDER_NAME,
    ...variables,
  };

  const finalSubject = applyVariables(template.subject, vars);
  const finalBody = applyVariables(template.body, vars);
  const recipient = to ?? lead.email;

  // Send via Gmail SMTP with App Password
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SENDER_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: recipient,
      subject: finalSubject,
      text: finalBody,
      html: finalBody.replace(/\n/g, "<br>"),
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("[send-email] SMTP error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
