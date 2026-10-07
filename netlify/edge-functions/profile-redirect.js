const UUID_PROFILE_PATH = /^\/profile\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

/** Public identity only: no session, content, or follow-count lookup. */
export default async function profileRedirect(request, context) {
  const url = new URL(request.url);
  const match = UUID_PROFILE_PATH.exec(url.pathname);
  if (!match || !["GET", "HEAD"].includes(request.method)) return;

  const supabaseUrl = globalThis.Netlify.env.get("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = globalThis.Netlify.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (supabaseUrl && anonKey) {
    try {
      const lookup = new URL("/rest/v1/profiles", supabaseUrl);
      lookup.searchParams.set("select", "public_id");
      lookup.searchParams.set("id", `eq.${match[1].toLowerCase()}`);
      const response = await fetch(lookup, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        const rows = await response.json();
        const publicId = Array.isArray(rows) && rows.length === 1 ? rows[0]?.public_id : null;
        // Keep malformed identities and UUID-shaped targets out of the cache.
        if (typeof publicId === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(publicId)
          && !UUID_PROFILE_PATH.test(`/profile/${publicId}`)) {
          return new Response(null, {
            status: 308,
            headers: {
              Location: `/profile/${publicId}${url.search}`,
              "Cache-Control": "public, max-age=0, must-revalidate",
              "Netlify-CDN-Cache-Control": "public, s-maxage=600",
              "Netlify-Vary": "query",
            },
          });
        }
      }
    } catch {
      // A transient lookup failure must not break the existing compatibility page.
    }
  }

  const fallback = await context.next();
  const response = new Response(fallback.body, fallback);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Netlify-CDN-Cache-Control", "no-store");
  response.headers.set("Netlify-Vary", "query");
  return response;
}
