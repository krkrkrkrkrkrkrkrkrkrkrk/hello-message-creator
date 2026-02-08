export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)

      // 🔀 PROXY PARA API (Supabase escondido)
      if (url.pathname.startsWith("/api")) {
        url.hostname = "qrypwjkvpsatbvhtyeuw.supabase.co"
        url.pathname = url.pathname.replace("/api", "")

        // Preserve headers/method/body (Accept, sec-fetch-*, etc)
        const upstreamReq = new Request(url.toString(), request)
        const res = await fetch(upstreamReq)

        // 🧹 remove qualquer header com "supabase"
        const headers = new Headers(res.headers)
        for (const key of headers.keys()) {
          if (key.toLowerCase().includes("supabase")) {
            headers.delete(key)
          }
        }

        return new Response(res.body, {
          status: res.status,
          headers,
        })
      }

      // Helpers to detect SPA navigation requests
      const accept = (request.headers.get("Accept") || "").toLowerCase()
      const secFetchMode = (request.headers.get("sec-fetch-mode") || "").toLowerCase()
      const secFetchDest = (request.headers.get("sec-fetch-dest") || "").toLowerCase()
      const isHtmlNavigation =
        accept.includes("text/html") || secFetchMode === "navigate" || secFetchDest === "document"

      const path = url.pathname
      const lastSegment = path.split("/").pop() || ""
      const looksLikeFile = lastSegment.includes(".") || path.startsWith("/assets/")

      // 📦 arquivos estáticos (SPA-friendly)
      // 1) Try to serve the asset as-is.
      let assetRes
      try {
        assetRes = await env.ASSETS.fetch(request)
      } catch (e) {
        // If asset layer throws, treat as missing and fall back below.
        assetRes = null
      }

      if (assetRes && assetRes.status !== 404) {
        return assetRes
      }

      // 2) SPA fallback: if it's a browser navigation to a "route" (no file extension),
      // serve the app entry ("/") so refresh works for /marketplace, /scripthub, etc.
      if ((request.method === "GET" || request.method === "HEAD") && isHtmlNavigation && !looksLikeFile) {
        const rootUrl = new URL(request.url)
        rootUrl.pathname = "/"
        try {
          // IMPORTANT: don't clone the original request here.
          // `env.ASSETS.fetch()` can throw for some cloned Requests; a minimal navigation
          // request is the most compatible approach.
          const rootReq = new Request(rootUrl.toString(), {
            method: request.method,
            headers: {
              Accept: "text/html",
            },
          })
          return await env.ASSETS.fetch(rootReq)
        } catch (e) {
          // Last resort: return a plain error instead of throwing (avoids 1101)
          return new Response("Worker error (SPA fallback failed)", { status: 500 })
        }
      }

      return assetRes || new Response("Not Found", { status: 404 })
    } catch (err) {
      // Never let exceptions bubble up to Cloudflare (prevents error 1101 pages)
      return new Response("Worker error", { status: 500 })
    }
  },
}
