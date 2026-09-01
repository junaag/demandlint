import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

type InvitationAction = "invite" | "resend";

interface InvitationRequest {
  action?: InvitationAction;
  organizationId?: string;
  email?: string;
  role?: "admin" | "member";
  memberId?: string;
}

interface MemberRow {
  member_id: string;
  email: string;
  status: "active" | "invited";
}

interface DeliveryRow {
  email: string;
  member_role: "admin" | "member";
  member_status: "active" | "invited";
  organization_name: string;
  inviter_name: string;
}

interface EmailEligibilityRow {
  eligible: boolean;
  reason: "consumer" | "disposable" | "invalid" | null;
}

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid work email address.");
  return email;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function invitationEmail(delivery: DeliveryRow, invitationUrl: string) {
  const organizationName = escapeHtml(delivery.organization_name);
  const inviterName = escapeHtml(delivery.inviter_name);
  const roleLabel = delivery.member_role === "admin" ? "an admin" : "a member";
  return {
    subject: `${delivery.inviter_name} invited you to ${delivery.organization_name} on DemandLint`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f6fb;color:#172033;font-family:Inter,Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden">Join ${organizationName} and keep CRM imports clean before they go live.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e1e6ef;border-radius:18px">
          <tr><td style="padding:34px 38px 12px">
            <div style="font-size:20px;font-weight:800">DemandLint</div>
          </td></tr>
          <tr><td style="padding:12px 38px 36px">
            <p style="margin:0 0 10px;color:#4c63d2;font-size:12px;font-weight:800;letter-spacing:.08em">WORKSPACE INVITATION</p>
            <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2">Help ${organizationName} keep bad lead data out of the CRM.</h1>
            <p style="margin:0 0 14px;color:#566176;font-size:16px;line-height:1.6">${inviterName} invited you to join the <strong>${organizationName}</strong> workspace as ${roleLabel}.</p>
            <p style="margin:0 0 26px;color:#566176;font-size:16px;line-height:1.6">DemandLint checks CSV and Excel files, catches mapping issues, and normalizes contact details before an import reaches Salesforce or another CRM.</p>
            <a href="${invitationUrl}" style="display:inline-block;padding:14px 22px;border-radius:10px;background:#5964e8;color:#fff;font-size:15px;font-weight:750;text-decoration:none">Accept invitation</a>
            <p style="margin:24px 0 0;color:#7b8597;font-size:13px;line-height:1.55">For security, DemandLint will send a 6-digit verification code to this email address. No password is required.</p>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;color:#8a93a3;font-size:12px">If you were not expecting this invitation, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </body>
</html>`,
    text: `${delivery.inviter_name} invited you to join ${delivery.organization_name} on DemandLint as ${roleLabel}.\n\nDemandLint helps teams catch CRM import issues before they go live.\n\nAccept the invitation: ${invitationUrl}\n\nDemandLint will send a 6-digit verification code to this email address. No password is required.`,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const authorization = request.headers.get("Authorization");
    if (!supabaseUrl || !publishableKey || !authorization) throw new Error("Invitation service is not configured.");
    if (!resendApiKey) throw new Error("Invitation email delivery is not configured.");

    const body = await request.json() as InvitationRequest;
    if (!body.organizationId || !body.action) throw new Error("Missing invitation request details.");

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: "Authentication required." }, 401);

    let email: string;
    let requirePending = false;
    if (body.action === "invite") {
      if (!body.email || !body.role || !["admin", "member"].includes(body.role)) {
        throw new Error("Enter an email and choose a valid workspace role.");
      }
      email = normalizeEmail(body.email);
      const { data: eligibilityData, error: eligibilityError } = await userClient.rpc(
        "evaluate_email_eligibility",
        { input_email: email },
      );
      if (eligibilityError) throw new Error(eligibilityError.message);
      const eligibility = (eligibilityData as EmailEligibilityRow[] | null)?.[0];
      if (!eligibility?.eligible) {
        throw new Error(
          eligibility?.reason === "disposable"
            ? "Temporary email addresses are not supported. Please use your work email address."
            : "DemandLint is available for business accounts only. Please sign in with your work email address.",
        );
      }
      const { error } = await userClient.rpc("invite_organization_member", {
        target_organization_id: body.organizationId,
        member_email: email,
        member_role: body.role,
      });
      if (error) throw new Error(error.message);
    } else {
      if (!body.memberId) throw new Error("Choose a pending invitation to resend.");
      const { data, error } = await userClient.rpc("list_organization_members", {
        target_organization_id: body.organizationId,
      });
      if (error) throw new Error(error.message);
      const member = ((data ?? []) as MemberRow[]).find((row) => row.member_id === body.memberId);
      if (!member || member.status !== "invited") throw new Error("Only pending invitations can be resent.");
      email = member.email;
      requirePending = true;
    }

    const { data: deliveryData, error: deliveryError } = await userClient.rpc(
      "get_organization_invitation_delivery",
      {
        target_organization_id: body.organizationId,
        target_member_email: email,
        require_pending: requirePending,
      },
    );
    if (deliveryError) throw new Error(deliveryError.message);
    const delivery = (deliveryData as DeliveryRow[] | null)?.[0];
    if (!delivery) throw new Error("The invitation could not be prepared.");

    const applicationUrl = new URL(Deno.env.get("DEMANDLINT_APP_URL") ?? "https://demandlint.com");
    const applicationBasePath = applicationUrl.pathname.replace(/\/$/, "");
    applicationUrl.pathname = `${applicationBasePath}/auth`;
    applicationUrl.searchParams.set("mode", delivery.member_status === "active" ? "login" : "signup");
    applicationUrl.searchParams.set("email", delivery.email);
    applicationUrl.searchParams.set("next", `${applicationBasePath}/settings`);
    const emailContent = invitationEmail(delivery, applicationUrl.toString());

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") ?? "DemandLint <auth@demandlint.com>",
        to: [delivery.email],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    });
    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      console.error("Resend invitation delivery failed", resendResponse.status, detail);
      throw new Error("The invitation was saved, but the email could not be sent. Try resending it.");
    }

    return jsonResponse({ ok: true, email: delivery.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The invitation could not be sent.";
    return jsonResponse({ error: message }, 400);
  }
});
