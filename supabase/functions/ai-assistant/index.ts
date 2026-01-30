import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const defaultSystemPrompt = `You are the ShadowAuth AI assistant, expert in Roblox Lua scripting and script protection.

ROBLOX KNOWLEDGE:
- Full Roblox API: game, workspace, Players, ReplicatedStorage, TweenService, RunService, etc.
- Executor functions: printidentity(), getgenv(), hookfunction(), loadstring(), getrawmetatable()
- Script execution: fireclickdetector(), firetouchinterest(), getnamecallmethod(), newcclosure()
- Drawing library, syn/fluxus/krnl APIs, request/http_request

PLATFORM HELP:
- Script management and license keys
- Discord bot setup
- ShadowAuth API usage
- Script obfuscation and protection

FORMATTING:
- Keep responses SHORT and CONCISE
- Use \`\`\`lua for code blocks
- Use bullet points (-) for lists
- **Bold** for important terms only
- Always respond in the same language as the user`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stream = false } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check if first message is a system message, if not use default
    let finalMessages = messages;
    if (!messages.length || messages[0].role !== "system") {
      finalMessages = [
        { role: "system", content: defaultSystemPrompt },
        ...messages,
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: finalMessages,
        stream: stream,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later.", response: null }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted, contact support.", response: null }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI assistant error", response: null }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If streaming, pass through the stream
    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming: parse and return the response
    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    
    console.log("AI Response generated successfully");

    return new Response(JSON.stringify({ response: aiResponse, error: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", response: null }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
