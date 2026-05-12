// Helpers for fetching and lightly parsing remote HTML pages so the AI routes
// (research-profile, research-opportunity) can analyse a real page rather than
// guess from the URL alone. Lives outside /app/api/* because Next.js only
// allows specific exports (GET, POST, …) from route.ts files.

export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function extractMetaContent(html: string, nameOrProperty: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${nameOrProperty}["'][^>]+content=["']([^"']*)["']`,
    "i"
  )
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${nameOrProperty}["']`,
    "i"
  )
  return html.match(re)?.[1] ?? html.match(re2)?.[1] ?? ""
}

export async function fetchPageText(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BrandFlow/1.0; +https://brandflow.app) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const html = await res.text()
      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? ""
      const description = extractMetaContent(html, "description")
      const ogTitle = extractMetaContent(html, "og:title")
      const ogDesc = extractMetaContent(html, "og:description")
      const ogType = extractMetaContent(html, "og:type")
      const bodyText = stripHtml(html).slice(0, 2500)
      return [title, ogTitle, ogType, description, ogDesc, bodyText]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 3000)
    }
  } catch {
    // fall through
  }
  return "(Page content could not be fetched — analyse from URL only)"
}
