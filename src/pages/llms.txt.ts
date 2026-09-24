import type { APIRoute } from "astro";
import { site } from "../site.config";
import { llmsHeader, pageList } from "../lib/llms";

export const GET: APIRoute = () => {
  const body = `${llmsHeader()}
## Pages
${pageList()}

## Optional
- [Full text with FAQ answers](${site.url}/llms-full.txt)
- [Publisher](${site.publisherUrl}): ${site.publisherName}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
