/**
 * SHADOWAUTH CDN NODE SELECTION (Luarmor-identical)
 * ==================================================
 * Real timezone-based node selection extracted from Luarmor source:
 * 
 * From deobfuscated source (lines 152-188):
 * - Uses os.time(os.date("*t")) - os.time(os.date("!*t")) for timezone offset
 * - Selects nodes based on UTC hour ranges:
 *   - 21:00-05:00 UTC → EU nodes (eu1, eu2)
 *   - 05:00-15:00 UTC → Asia/AU nodes (as1, as2, as3, au1, au2)
 *   - 15:00-21:00 UTC → US nodes (us1, us2)
 * - Override: Australia region → force AU nodes
 * - Each region has multiple nodes for random load balancing
 * 
 * In ShadowAuth, nodes map to Supabase Edge regions via path-based routing.
 * Since Supabase Edge Functions deploy globally via Deno Deploy, we use
 * the CF-IPCountry header to determine the real edge region.
 */

export interface CDNNode {
  id: string;
  region: string;
  weight: number; // Higher = more likely selected
}

// Real node pools keyed by region group
const NODE_POOLS: Record<string, CDNNode[]> = {
  eu: [
    { id: "eu1", region: "eu-central-1", weight: 1 },
    { id: "eu2", region: "eu-west-2", weight: 1 },
  ],
  asia: [
    { id: "as1", region: "ap-southeast-1", weight: 1 },
    { id: "as2", region: "ap-northeast-1", weight: 1 },
    { id: "as3", region: "ap-southeast-2", weight: 1 },
  ],
  au: [
    { id: "au1", region: "ap-southeast-2", weight: 2 },
    { id: "au2", region: "ap-southeast-2", weight: 1 },
  ],
  us: [
    { id: "us1", region: "us-east-1", weight: 1 },
    { id: "us2", region: "us-west-2", weight: 1 },
  ],
  sa: [
    { id: "sa1", region: "sa-east-1", weight: 1 },
  ],
};

// Country → region group mapping (from CF-IPCountry header)
const COUNTRY_TO_REGION: Record<string, string> = {
  // Australia override (Luarmor line 183)
  AU: "au", NZ: "au",
  // Asia
  JP: "asia", KR: "asia", CN: "asia", TW: "asia", HK: "asia",
  SG: "asia", MY: "asia", TH: "asia", PH: "asia", VN: "asia",
  ID: "asia", IN: "asia", PK: "asia", BD: "asia",
  // Europe
  GB: "eu", DE: "eu", FR: "eu", NL: "eu", IT: "eu", ES: "eu",
  PT: "eu", PL: "eu", SE: "eu", NO: "eu", DK: "eu", FI: "eu",
  BE: "eu", AT: "eu", CH: "eu", IE: "eu", CZ: "eu", RO: "eu",
  HU: "eu", BG: "eu", HR: "eu", SK: "eu", SI: "eu", LT: "eu",
  LV: "eu", EE: "eu", RU: "eu", UA: "eu", TR: "eu",
  // South America
  BR: "sa", AR: "sa", CL: "sa", CO: "sa", PE: "sa", VE: "sa",
  EC: "sa", UY: "sa", PY: "sa", BO: "sa",
  // North America defaults to US
  US: "us", CA: "us", MX: "us",
};

/**
 * Select optimal node using Luarmor's timezone-based algorithm
 * with real CF-IPCountry override (lines 152-188)
 */
export function selectNode(req: Request): { nodeId: string; region: string } {
  const country = req.headers.get("cf-ipcountry") || "";
  
  // Country override (Luarmor line 183: Australia check)
  const countryRegion = COUNTRY_TO_REGION[country.toUpperCase()];
  if (countryRegion) {
    const pool = NODE_POOLS[countryRegion];
    const node = weightedRandom(pool);
    return { nodeId: node.id, region: node.region };
  }
  
  // Timezone-based selection (Luarmor lines 161-179)
  const utcHour = new Date().getUTCHours();
  let regionGroup: string;
  
  if (utcHour >= 21 || utcHour < 5) {
    regionGroup = "eu";
  } else if (utcHour >= 5 && utcHour < 15) {
    regionGroup = "asia";
  } else {
    regionGroup = "us";
  }
  
  const pool = NODE_POOLS[regionGroup];
  const node = weightedRandom(pool);
  return { nodeId: node.id, region: node.region };
}

function weightedRandom(pool: CDNNode[]): CDNNode {
  const totalWeight = pool.reduce((sum, n) => sum + n.weight, 0);
  let r = Math.random() * totalWeight;
  for (const node of pool) {
    r -= node.weight;
    if (r <= 0) return node;
  }
  return pool[0];
}

/**
 * Generate Lua code for client-side node selection
 * This is embedded in Layer 1 bootstrap (Luarmor-identical pattern)
 */
export function generateLuaNodeSelector(supabaseUrl: string): string {
  return `
-- ShadowAuth CDN Node Selection (Luarmor-identical timezone algo)
-- Region tag is passed as query param for analytics + edge routing hints
local _SA_NODE = "${supabaseUrl}/functions/v1"
local _SA_REGION = "us"
do
  local _tz = os.time(os.date("*t")) - os.time(os.date("!*t"))
  if _tz < 0 then _tz = (86400 + -(-_tz % 86400)) % 86400 else _tz = _tz % 86400 end
  local _h = _tz / 3600
  if _h >= 21 or _h < 5 then
    _SA_REGION = "eu"
  elseif _h >= 5 and _h < 15 then
    _SA_REGION = "as"
  else
    _SA_REGION = "us"
  end
  pcall(function()
    local loc = game:GetService("LocalizationService")
    local region = loc:GetCountryRegionForPlayerAsync(game:GetService("Players").LocalPlayer)
    if region == "AU" or region == "NZ" then _SA_REGION = "au"
    elseif region == "BR" or region == "AR" then _SA_REGION = "sa"
    elseif region == "JP" or region == "KR" or region == "CN" then _SA_REGION = "as" end
  end)
end
`;
}

/**
 * Get node info for API responses (used by /sync endpoint)
 */
export function getNodeInfo(req: Request): { nodeId: string; region: string; allNodes: string[] } {
  const selected = selectNode(req);
  const allNodes = Object.values(NODE_POOLS)
    .flat()
    .map(n => n.id);
  
  return {
    nodeId: selected.nodeId,
    region: selected.region,
    allNodes,
  };
}
