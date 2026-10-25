import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import { relatedCategoryKey } from './categories.mjs';
const parser = unified().use(remarkParse).use(remarkDirective).use(remarkMath);
// Parse once for both reading estimates and automatic excerpts. Directives are
// structural Markdown, so their fences / attributes never leak into summaries.
const analysis = new Map();
function analyze(markdown) {
  if (analysis.has(markdown)) return analysis.get(markdown);
  const parts = [], excerpts = [];
  function visit(node) {
    if (['code', 'image', 'imageReference', 'math', 'inlineMath', 'definition'].includes(node.type)) return;
    if (node.type === 'inlineCode') { excerpts.push(node.value); return; }
    if (node.type === 'textDirective') {
      excerpts.push(String(markdown || '').slice(node.position.start.offset, node.position.end.offset));
      const length = excerpts.length;
      node.children?.forEach(visit); // Keep the existing reading estimate for its child text.
      excerpts.length = length;
      return;
    }
    if (node.type === 'html') {
      excerpts.push(node.value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, ''));
      return;
    }
    if (node.type === 'text') { parts.push(node.value); excerpts.push(node.value); }
    node.children?.forEach(visit);
    if (['paragraph', 'heading', 'tableCell', 'listItem'].includes(node.type)) excerpts.push(' ');
  }
  visit(parser.parse(markdown || ''));
  const plain = parts.join(' ');
  const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
  const cjk = plain.match(cjkPattern) || [];
  const words = plain.replace(cjkPattern, ' ').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
  const result = { minutes: Math.max(1, Math.ceil(cjk.length / 400 + words.length / 220)), excerpt: excerpts.join('').replace(/\s+/g, ' ').trim() };
  if (analysis.size >= 4096) analysis.delete(analysis.keys().next().value);
  analysis.set(markdown, result);
  return result;
}
/** Approximation: 400 Han/kana/hangul characters or 220 Latin words per minute. */
export const readingMinutes = markdown => analyze(markdown).minutes;
export const excerptText = markdown => analyze(markdown).excerpt;
/** Same category with shared tags, same category, then shared tags; no unrelated filler. */
export function relatedPosts(current, posts, limit = 3) {
  return posts
    .filter(
      (post) =>
        post.id !== current.id &&
        !post.data.draft &&
        Boolean(post.data.demo) === Boolean(current.data.demo),
    )
    .map((post) => {
      const category =
        relatedCategoryKey(current.data) !== null &&
        relatedCategoryKey(post.data) === relatedCategoryKey(current.data);
      const shared = new Set(
        post.data.tags.filter((tag) => current.data.tags.includes(tag)),
      ).size;
      return {
        post,
        shared,
        rank: category ? (shared ? 0 : 1) : 2,
        related: category || shared > 0,
      };
    })
    .filter((item) => item.related)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.shared - a.shared ||
        b.post.data.date.localeCompare(a.post.data.date) ||
        a.post.id.localeCompare(b.post.id),
    )
    .slice(0, limit)
    .map((item) => item.post);
}
