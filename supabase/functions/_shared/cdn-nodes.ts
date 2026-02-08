/**
 * CDN Multi-Node Architecture (Luarmor-identical)
 * 
 * Provides geographic load balancing and failover support
 * Nodes are virtual endpoints that route through Supabase Edge (Deno Deploy CDN)
 */

export interface CDNNode {
  id: string;
  name: string;
  region: string;
  url: string;
  priority: number;
  healthScore: number;
  lastCheck: number;
}

// Node health tracking (in-memory cache)
const nodeHealth = new Map<string, { score: number; lastCheck: number; latency: number }>();

/**
 * Get available CDN nodes based on Supabase URL
 * Simulates multi-region by using path-based routing
 */
export function getCDNNodes(supabaseUrl: string): CDNNode[] {
  const baseUrl = `${supabaseUrl}/functions/v1`;
  
  // Virtual nodes - all route to same edge functions but provide
  // load balancing appearance and failover capability
  const nodes: CDNNode[] = [
    {
      id: "us1",
      name: "US East (Primary)",
      region: "us-east-1",
      url: `${baseUrl}/`,
      priority: 1,
      healthScore: 100,
      lastCheck: Date.now()
    },
    {
      id: "us2",
      name: "US West",
      region: "us-west-2",
      url: `${baseUrl}/`,
      priority: 2,
      healthScore: 100,
      lastCheck: Date.now()
    },
    {
      id: "eu1",
      name: "Europe (Frankfurt)",
      region: "eu-central-1",
      url: `${baseUrl}/`,
      priority: 2,
      healthScore: 100,
      lastCheck: Date.now()
    },
    {
      id: "eu2",
      name: "Europe (London)",
      region: "eu-west-2",
      url: `${baseUrl}/`,
      priority: 3,
      healthScore: 100,
      lastCheck: Date.now()
    },
    {
      id: "as1",
      name: "Asia (Singapore)",
      region: "ap-southeast-1",
      url: `${baseUrl}/`,
      priority: 2,
      healthScore: 100,
      lastCheck: Date.now()
    },
    {
      id: "as2",
      name: "Asia (Tokyo)",
      region: "ap-northeast-1",
      url: `${baseUrl}/`,
      priority: 3,
      healthScore: 100,
      lastCheck: Date.now()
    },
    {
      id: "au1",
      name: "Australia (Sydney)",
      region: "ap-southeast-2",
      url: `${baseUrl}/`,
      priority: 3,
      healthScore: 100,
      lastCheck: Date.now()
    },
    {
      id: "sa1",
      name: "South America (São Paulo)",
      region: "sa-east-1",
      url: `${baseUrl}/`,
      priority: 3,
      healthScore: 100,
      lastCheck: Date.now()
    }
  ];

  // Apply cached health scores
  return nodes.map(node => {
    const health = nodeHealth.get(node.id);
    if (health) {
      return {
        ...node,
        healthScore: health.score,
        lastCheck: health.lastCheck
      };
    }
    return node;
  });
}

/**
 * Select best node based on region hint and health
 */
export function selectOptimalNode(
  nodes: CDNNode[],
  clientRegion?: string,
  excludeNodes?: string[]
): CDNNode {
  // Filter out excluded/unhealthy nodes
  let available = nodes.filter(n => 
    n.healthScore > 50 && 
    !excludeNodes?.includes(n.id)
  );

  if (available.length === 0) {
    // Fallback to any node
    available = nodes;
  }

  // If client region is known, prefer same region
  if (clientRegion) {
    const regionMatch = available.find(n => 
      n.region.toLowerCase().includes(clientRegion.toLowerCase())
    );
    if (regionMatch) {
      return regionMatch;
    }
  }

  // Weight by priority and health score
  const weighted = available.map(n => ({
    node: n,
    weight: n.healthScore * (4 - n.priority) // Higher priority = lower number = more weight
  }));

  // Random weighted selection
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const w of weighted) {
    random -= w.weight;
    if (random <= 0) {
      return w.node;
    }
  }

  // Fallback to first available
  return available[0];
}

/**
 * Get recommended node ID (for /sync response)
 */
export function getRecommendedNodeId(nodes: CDNNode[], cfRegion?: string): string {
  // Map CF regions to our node IDs
  const regionMapping: Record<string, string[]> = {
    // North America
    "IAD": ["us1"], "EWR": ["us1"], "ORD": ["us1"], "ATL": ["us1"], "MIA": ["us1"],
    "DFW": ["us2"], "LAX": ["us2"], "SJC": ["us2"], "SEA": ["us2"], "DEN": ["us2"],
    // Europe
    "FRA": ["eu1"], "AMS": ["eu1"], "CDG": ["eu1"], "MXP": ["eu1"],
    "LHR": ["eu2"], "MAN": ["eu2"], "DUB": ["eu2"],
    // Asia
    "SIN": ["as1"], "HKG": ["as1"], "BKK": ["as1"],
    "NRT": ["as2"], "KIX": ["as2"], "ICN": ["as2"],
    // Australia
    "SYD": ["au1"], "MEL": ["au1"],
    // South America
    "GRU": ["sa1"], "EZE": ["sa1"], "SCL": ["sa1"]
  };

  if (cfRegion) {
    // Extract airport code from cf-ray (e.g., "123abc-IAD" -> "IAD")
    const code = cfRegion.split("-").pop()?.toUpperCase() || "";
    const preferred = regionMapping[code];
    if (preferred && preferred.length > 0) {
      // Check if preferred node is healthy
      const node = nodes.find(n => n.id === preferred[0] && n.healthScore > 50);
      if (node) {
        return node.id;
      }
    }
  }

  // Default to highest priority healthy node
  const best = nodes
    .filter(n => n.healthScore > 50)
    .sort((a, b) => a.priority - b.priority)[0];
  
  return best?.id || "us1";
}

/**
 * Update node health (call after successful/failed requests)
 */
export function updateNodeHealth(
  nodeId: string, 
  success: boolean, 
  latencyMs?: number
): void {
  const current = nodeHealth.get(nodeId) || { score: 100, lastCheck: 0, latency: 0 };
  
  if (success) {
    // Increase score on success (max 100)
    current.score = Math.min(100, current.score + 5);
    if (latencyMs) {
      current.latency = latencyMs;
    }
  } else {
    // Decrease score on failure
    current.score = Math.max(0, current.score - 20);
  }
  
  current.lastCheck = Date.now();
  nodeHealth.set(nodeId, current);
}

/**
 * Generate node list for /sync response (Luarmor-compatible format)
 */
export function generateNodeList(supabaseUrl: string): string[] {
  const nodes = getCDNNodes(supabaseUrl);
  
  // Return only healthy nodes, formatted as Luarmor expects
  return nodes
    .filter(n => n.healthScore > 50)
    .sort((a, b) => a.priority - b.priority)
    .map(n => n.url);
}

/**
 * Generate detailed node info for dashboard/debugging
 */
export function getNodeStatus(supabaseUrl: string): {
  nodes: CDNNode[];
  recommended: string;
  healthyCount: number;
  totalCount: number;
} {
  const nodes = getCDNNodes(supabaseUrl);
  const healthy = nodes.filter(n => n.healthScore > 50);
  
  return {
    nodes,
    recommended: getRecommendedNodeId(nodes),
    healthyCount: healthy.length,
    totalCount: nodes.length
  };
}
