export const dynamic = "force-static";

// Google Search Console HTML-file verification backup. Google fetches
// /google<TOKEN>.html and checks for an exact content match.
// To use: in Search Console, choose "HTML file" verification method and
// confirm the suggested file path matches the route below.

const TOKEN = "bQYnyEGm3PSVkOb3fRb6Iw4SvqSeVT1ITd8FLPxYpwk";

export async function GET() {
  return new Response(`google-site-verification: google${TOKEN}.html\n`, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
