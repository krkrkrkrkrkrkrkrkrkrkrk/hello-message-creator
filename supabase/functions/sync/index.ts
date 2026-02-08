import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { 
  getCDNNodes, 
  getRecommendedNodeId, 
  generateNodeList,
  getNodeStatus,
  updateNodeHealth
} from "../_shared/cdn-nodes.ts";

/**
 * LUARMOR-STYLE /sync ENDPOINT
 * Returns server time, available nodes for load balancing, and health status
 * This is the FIRST step in the tracepath validation sequence
 * 
 * Features:
 * - Multi-node CDN support (8 global regions)
 * - Geographic node recommendation based on CF-Ray
 * - Node health tracking and failover
 * - Luarmor-compatible response format
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shadow-sig",
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serverTime = Math.floor(Date.now() / 1000);

  // Get Cloudflare region from headers
  const cfRay = req.headers.get("cf-ray") || "";
  const cfRegion = cfRay.split("-")[1] || "";
  const cfCountry = req.headers.get("cf-ipcountry") || "";
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("cf-connecting-ip") || "unknown";

  // Get node information
  const nodes = getCDNNodes(supabaseUrl);
  const recommendedId = getRecommendedNodeId(nodes, cfRay);
  const nodeUrls = generateNodeList(supabaseUrl);

  // Build response (Luarmor-compatible format)
  const response = {
    st: serverTime,                    // Server time (UNIX timestamp)
    cf: cfRegion || "GLOBAL",          // Cloudflare region
    cc: cfCountry,                     // Country code
    nodes: nodeUrls,                   // Available node URLs
    recommended: recommendedId,        // Recommended node ID
    v: "3.1.0",                        // API version
    
    // Extended info (ShadowAuth-specific)
    _ext: {
      node_count: nodes.length,
      healthy_nodes: nodes.filter(n => n.healthScore > 50).length,
      client_region: cfRegion || null,
      latency_hint: cfCountry ? getLatencyHint(cfCountry) : null
    }
  };

  // Log sync request for analytics
  console.log(`[SYNC] ${clientIP} -> ${cfRegion || "GLOBAL"} (${cfCountry}) -> recommended: ${recommendedId}`);

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 
      ...corsHeaders, 
      "Content-Type": "application/json",
      "X-Server-Time": serverTime.toString(),
      "X-Recommended-Node": recommendedId,
      "X-Node-Count": nodes.length.toString()
    },
  });
});

/**
 * Get latency hint based on country code
 */
function getLatencyHint(countryCode: string): string {
  const hints: Record<string, string> = {
    // North America
    "US": "us1", "CA": "us1", "MX": "us2",
    // Europe
    "DE": "eu1", "FR": "eu1", "NL": "eu1", "BE": "eu1", "AT": "eu1", "CH": "eu1",
    "GB": "eu2", "IE": "eu2",
    "ES": "eu1", "IT": "eu1", "PT": "eu2", "PL": "eu1",
    // Asia
    "SG": "as1", "MY": "as1", "TH": "as1", "VN": "as1", "PH": "as1", "ID": "as1",
    "JP": "as2", "KR": "as2", "TW": "as2", "HK": "as1",
    // Australia/Oceania
    "AU": "au1", "NZ": "au1",
    // South America
    "BR": "sa1", "AR": "sa1", "CL": "sa1", "CO": "sa1", "PE": "sa1",
  };
  return hints[countryCode.toUpperCase()] || "us1";
}
