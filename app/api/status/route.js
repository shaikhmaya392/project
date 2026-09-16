import { NextResponse } from "next/server";
import { getLeads } from "../../../lib/leadsStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const leads = await getLeads();
  const websiteLeads = leads.filter((l) => l.source === "website_form");
  const lastWebsiteLead = websiteLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  return NextResponse.json({
    webhookConfigured: Boolean(process.env.WORDPRESS_API_KEY),
    totalLeads: leads.length,
    websiteLeads: websiteLeads.length,
    manualLeads: leads.length - websiteLeads.length,
    lastWebsiteLeadAt: lastWebsiteLead ? lastWebsiteLead.created_at : null,
  });
}
