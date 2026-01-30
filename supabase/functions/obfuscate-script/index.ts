import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LURAPH_API_BASE = "https://api.lura.ph/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const luraphApiKey = Deno.env.get("LURAPH_API_KEY");
    
    if (!luraphApiKey) {
      console.error("LURAPH_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Luraph API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { script, fileName, obfuscationType, settings } = await req.json();

    if (!script) {
      return new Response(
        JSON.stringify({ error: "Script content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If obfuscation type is "none", return the script as-is
    if (obfuscationType === "none") {
      console.log("No obfuscation requested, returning plain script");
      return new Response(
        JSON.stringify({ obfuscatedScript: script, type: "none" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For IB1 obfuscation, use simple built-in obfuscation
    if (obfuscationType === "ib1") {
      console.log("IB1 obfuscation requested");
      const obfuscatedScript = applyIB1Obfuscation(script, settings);
      return new Response(
        JSON.stringify({ obfuscatedScript, type: "ib1" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For Luraph obfuscation
    console.log("Luraph obfuscation requested");

    // Step 1: Get available nodes
    const nodesResponse = await fetch(`${LURAPH_API_BASE}/obfuscate/nodes`, {
      headers: { "Luraph-API-Key": luraphApiKey },
    });

    if (!nodesResponse.ok) {
      const errorText = await nodesResponse.text();
      console.error("Failed to get Luraph nodes:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to connect to Luraph API" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nodesData = await nodesResponse.json();
    const nodeId = nodesData.recommendedId;

    if (!nodeId || !nodesData.nodes[nodeId]) {
      console.error("No available Luraph nodes");
      return new Response(
        JSON.stringify({ error: "No Luraph nodes available" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build options based on available node options
    const nodeOptions = nodesData.nodes[nodeId].options;
    const obfuscationOptions: Record<string, boolean | string> = {};

    for (const [optionId, optionConfig] of Object.entries(nodeOptions)) {
      const config = optionConfig as any;
      
      // Set default values based on type and tier
      if (config.tier === "PREMIUM_ONLY" || config.tier === "CUSTOMER_ONLY") {
        // Use default/false for premium options we might not have access to
        if (config.type === "CHECKBOX") {
          obfuscationOptions[optionId] = false;
        } else if (config.type === "DROPDOWN" && config.choices?.length > 0) {
          obfuscationOptions[optionId] = config.choices[0];
        } else if (config.type === "TEXT") {
          obfuscationOptions[optionId] = "";
        }
      } else {
        // For free options, use our settings or defaults
        if (config.type === "CHECKBOX") {
          obfuscationOptions[optionId] = settings?.stringEncryption ?? true;
        } else if (config.type === "DROPDOWN" && config.choices?.length > 0) {
          obfuscationOptions[optionId] = config.choices[0];
        } else if (config.type === "TEXT") {
          obfuscationOptions[optionId] = "";
        }
      }
    }

    // Step 2: Submit obfuscation job
    const scriptBase64 = btoa(unescape(encodeURIComponent(script)));

    const obfuscateResponse = await fetch(`${LURAPH_API_BASE}/obfuscate/new`, {
      method: "POST",
      headers: {
        "Luraph-API-Key": luraphApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: fileName || "script.lua",
        node: nodeId,
        script: scriptBase64,
        options: obfuscationOptions,
        enforceSettings: false, // Don't require all options
      }),
    });

    if (!obfuscateResponse.ok) {
      const errorData = await obfuscateResponse.json();
      console.error("Luraph obfuscation failed:", errorData);
      
      // If Luraph fails, fall back to IB1
      console.log("Falling back to IB1 obfuscation");
      const obfuscatedScript = applyIB1Obfuscation(script, settings);
      return new Response(
        JSON.stringify({ 
          obfuscatedScript, 
          type: "ib1", 
          warning: "Luraph unavailable, used IB1 fallback" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const obfuscateData = await obfuscateResponse.json();
    const jobId = obfuscateData.jobId;

    console.log("Luraph job created:", jobId);

    // Step 3: Wait for obfuscation to complete
    const statusResponse = await fetch(`${LURAPH_API_BASE}/obfuscate/status/${jobId}`, {
      headers: { "Luraph-API-Key": luraphApiKey },
    });

    // The status endpoint returns an empty response on success, or JSON with error on failure
    const statusText = await statusResponse.text();
    
    if (statusText && statusText.trim()) {
      try {
        const statusData = JSON.parse(statusText);
        if (statusData.error) {
          console.error("Luraph obfuscation error:", statusData.error);
          return new Response(
            JSON.stringify({ error: `Luraph error: ${statusData.error}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (parseError) {
        console.log("Status response (non-JSON):", statusText);
      }
    }
    
    console.log("Luraph obfuscation completed successfully");

    // Step 4: Download the obfuscated script
    const downloadResponse = await fetch(`${LURAPH_API_BASE}/obfuscate/download/${jobId}`, {
      headers: { "Luraph-API-Key": luraphApiKey },
    });

    if (!downloadResponse.ok) {
      console.error("Failed to download obfuscated script");
      return new Response(
        JSON.stringify({ error: "Failed to download obfuscated script" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const obfuscatedScript = await downloadResponse.text();

    console.log("Luraph obfuscation successful, script size:", obfuscatedScript.length);

    return new Response(
      JSON.stringify({ obfuscatedScript, type: "luraph", jobId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Obfuscation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Simple IB1-style obfuscation (free, built-in)
function applyIB1Obfuscation(script: string, settings: any): string {
  const lines = script.split("\n");
  const varMap = new Map<string, string>();
  let varCounter = 0;

  // Generate random variable name
  const genVar = () => {
    varCounter++;
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let name = "_";
    for (let i = 0; i < 8; i++) {
      name += chars[Math.floor(Math.random() * chars.length)];
    }
    return name + varCounter;
  };

  // String encryption
  const encryptString = (str: string): string => {
    if (!settings?.stringEncryption) return `"${str}"`;
    
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return `(function() local t={${bytes.join(",")}} local s="" for i=1,#t do s=s..string.char(t[i]) end return s end)()`;
  };

  // Process script
  let result = script;

  // Add anti-tamper wrapper if enabled
  if (settings?.antiTamper) {
    result = `local _ENV=setmetatable({},{__index=function(t,k)return rawget(_G,k)end,__newindex=function(t,k,v)rawset(_G,k,v)end})\n${result}`;
  }

  // Add control flow obfuscation if enabled
  if (settings?.controlFlowObfuscation) {
    const wrapperVar = genVar();
    result = `local ${wrapperVar}=(function(...)\n${result}\nend)\nreturn ${wrapperVar}(...)`;
  }

  // Add VM scrambling comment marker
  if (settings?.vmScrambling) {
    result = `--[[IB1:VM_SCRAMBLE]]\n${result}`;
  }

  // Add header
  const header = `--[[\n  Protected by ShadowAuth IB1 Obfuscator\n  Generated: ${new Date().toISOString()}\n]]\n`;

  return header + result;
}
