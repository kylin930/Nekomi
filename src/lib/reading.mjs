import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
const parser = unified().use(remarkParse).use(remarkDirective).use(remarkMath);
/** Approximation: 400 Han/kana/hangul characters or 220 Latin words per minute. */
const estimates = new Map();
export function readingMinutes(markdown) {
  if (estimates.has(markdown)) return estimates.get(markdown);
  const tree = parser.parse(markdown || '');
  const parts = [];
  function visit(node) {
    if (
      [
        'code',
        'inlineCode',
        'html',
        'image',
        'imageReference',
        'math',
        'inlineMath',
        'definition',
      ].includes(node.type)
    )
      return;
    if (node.type === 'text') parts.push(node.value);
    node.children?.forEach(visit);
  }
  visit(tree);
  const plain = parts.join(' ');
  const cjk =
    plain.match(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    ) || [];
  const words =
    plain
      .replace(
        /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
        ' ',
      )
      .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
  const minutes = Math.max(1, Math.ceil(cjk.length / 400 + words.length / 220));
  if (estimates.size >= 4096) estimates.delete(estimates.keys().next().value);
  estimates.set(markdown, minutes);
  return minutes;
}
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
        current.data.category !== '未分类' &&
        post.data.category === current.data.category;
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
