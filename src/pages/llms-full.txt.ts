import type { APIRoute } from "astro";
import { site } from "../site.config";
import { allFaqs } from "../data/faqs";
import { llmsHeader, pageList } from "../lib/llms";

/** /llms-full.txt — llms.txt plus every FAQ answer inlined. */
export const GET: APIRoute = () => {
  const faqText = allFaqs.map((f) => `### ${f.q}\n${f.a}`).join("\n\n");
  const body = `${llmsHeader()}
## Pages
${pageList()}

## FAQ
${faqText}

## Publisher
${site.publisherName} — ${site.publisherUrl}
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
