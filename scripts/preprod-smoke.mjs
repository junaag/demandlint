import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

import { loadEnv } from "vite";

const environment = loadEnv("preprod", process.cwd(), "");
const supabaseUrl = environment.VITE_SUPABASE_URL;
const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!supabaseUrl || !publishableKey) {
  throw new Error("Local pre-production requires .env.preprod.local. Copy the safe example and provide local Supabase values.");
}

const identity = {
  id: "00000000-0000-4000-8000-000000000312",
  email: "test@demandlint.local",
  password: "DemandLint-Local-Only-0312!",
};

const parsedUrl = new URL(supabaseUrl);
if (parsedUrl.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(parsedUrl.hostname)) {
  throw new Error("Pre-production smoke test refused a non-local Supabase URL.");
}

async function readJson(response, label) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${label} failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}

const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: publishableKey, "Content-Type": "application/json" },
  body: JSON.stringify({ email: identity.email, password: identity.password }),
});
const auth = await readJson(authResponse, "Local Auth sign-in");
if (auth.user?.id !== identity.id || !auth.access_token) {
  throw new Error("Local Auth returned an unexpected test identity.");
}

const headers = {
  apikey: publishableKey,
  Authorization: `Bearer ${auth.access_token}`,
};
const workspace = await readJson(await fetch(
  `${supabaseUrl}/rest/v1/profiles?select=email,display_name,active_organization_id&id=eq.${identity.id}`,
  { headers },
), "Workspace query");
if (workspace[0]?.email !== identity.email || !workspace[0]?.active_organization_id) {
  throw new Error("The deterministic local workspace seed is missing.");
}

const templates = await readJson(await fetch(
  `${supabaseUrl}/rest/v1/export_templates?select=id,name,config&organization_id=eq.${workspace[0].active_organization_id}`,
  { headers },
), "Export-template query");
if (!Array.isArray(templates) || templates.length < 3) {
  throw new Error("Representative local export-template seeds are missing.");
}

const client = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: sessionError } = await client.auth.setSession({ access_token: auth.access_token, refresh_token: auth.refresh_token });
if (sessionError) throw sessionError;
const workbook = new ExcelJS.Workbook();
workbook.addWorksheet("Instructions").getCell("A1").value = "Keep";
const importSheet = workbook.addWorksheet("Import");
importSheet.addRow(["Email", "Campaign"]);
workbook.addWorksheet("Reference").getCell("A1").value = "Reference";
const workbookBytes = new Uint8Array(await workbook.xlsx.writeBuffer());
const templateId = crypto.randomUUID();
const objectPath = `${workspace[0].active_organization_id}/${templateId}/${crypto.randomUUID()}.xlsx`;
const storage = client.storage.from("export-template-workbooks");
const { error: uploadError } = await storage.upload(objectPath, workbookBytes, {
  contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});
if (uploadError) throw new Error(`Workbook Storage upload failed: ${uploadError.message}`);
const { data: downloaded, error: downloadError } = await storage.download(objectPath);
if (downloadError || !downloaded || downloaded.size !== workbookBytes.byteLength) {
  throw new Error(`Workbook Storage download failed: ${downloadError?.message ?? "unexpected byte count"}`);
}
const foreignPath = `00000000-0000-4000-8000-000000000999/${templateId}/${crypto.randomUUID()}.xlsx`;
const { error: isolationError } = await storage.upload(foreignPath, workbookBytes, {
  contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
});
if (!isolationError) throw new Error("Workbook Storage accepted an object for another workspace.");
const { error: cleanupError } = await storage.remove([objectPath]);
if (cleanupError) throw new Error(`Workbook Storage cleanup failed: ${cleanupError.message}`);

console.log(`Local pre-production smoke test passed: ${identity.email}, ${templates.length} templates, private workbook Storage verified.`);
