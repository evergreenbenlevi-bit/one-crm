import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";

export default async function SignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("docuseal_document_url, status")
    .eq("id", id)
    .single();

  if (!proposal) notFound();

  if (!proposal.docuseal_document_url) {
    return (
      <main style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
        <h2>קישור החתימה עדיין לא נוצר</h2>
        <p>אנא פנה ל-Ben Levi לקבלת קישור חדש.</p>
      </main>
    );
  }

  redirect(proposal.docuseal_document_url);
}
