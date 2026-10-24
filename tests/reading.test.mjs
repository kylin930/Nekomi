import test from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes, relatedPosts } from '../src/lib/reading.mjs';
import { safeURL, remarkComponents } from '../src/plugins/components.mjs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import directive from 'remark-directive';
import math from 'remark-math';
const parse = (source, frontmatter = {}) => {
  const processor = unified()
    .use(remarkParse)
    .use(directive)
    .use(math)
    .use(remarkComponents);
  return processor.runSync(processor.parse(source), {
    value: source,
    data: { astro: { frontmatter } },
  });
};
test('reading time handles Chinese, English and mixed prose', () => {
  assert.equal(readingMinutes('中'.repeat(800)), 2);
  assert.equal(readingMinutes('word '.repeat(440)), 2);
  assert.equal(
    readingMinutes('中'.repeat(400) + '\n\n' + 'word '.repeat(220)),
    2,
  );
  assert.equal(readingMinutes(''), 1);
});
test('code, math, images, URLs and directive attributes are not prose words', () => {
  const source =
    '简短正文。\n\n```js\n' +
    'code '.repeat(5000) +
    '\n```\n\n$$\n' +
    'x+'.repeat(5000) +
    '1\n$$\n\n![图片](https://example.com/' +
    'long/'.repeat(5000) +
    ')\n\n:::note[提示]\n正文\n:::\n';
  assert.equal(readingMinutes(source), 1);
  assert.equal(readingMinutes('    ' + 'code '.repeat(5000)), 1);
});
const post = (id, data = {}) => ({
  id,
  data: {
    category: '工程',
    tags: [],
    date: '2026-01-01',
    draft: false,
    demo: false,
    ...data,
  },
});
test('related ranking has explicit categories and shared tag priorities', () => {
  const current = post('current', { tags: ['Astro', 'CSS'] });
  const result = relatedPosts(
    current,
    [
      current,
      post('same'),
      post('tag-only', { category: '笔记', tags: ['Astro'] }),
      post('both', { tags: ['Astro'] }),
      post('most', { tags: ['CSS', 'Astro'] }),
    ],
    3,
  );
  assert.deepEqual(
    result.map((p) => p.id),
    ['most', 'both', 'same'],
  );
});
test('recommendations exclude drafts, demo mixing, self and unrelated entries', () => {
  const current = post('current');
  assert.deepEqual(
    relatedPosts(current, [
      current,
      post('draft', { draft: true }),
      post('demo', { demo: true }),
      post('other', { category: '日常' }),
    ]),
    [],
  );
  assert.deepEqual(relatedPosts(current, [post('one')], 0), []);
  assert.equal(
    relatedPosts(post('demo', { demo: true }), [post('demo-2', { demo: true })])
      .length,
    1,
  );
  assert.equal(
    relatedPosts(post('uncategorized', { category: '未分类' }), [
      post('other', { category: '未分类' }),
    ]).length,
    0,
  );
});
for (const url of [
  'javascript:alert(1)',
  'data:text/html,hello',
  '//evil.example',
  'https://user:password@example.com/',
  '/\\evil',
  'https://example.com/ bad',
])
  test('reject unsafe directive URL ' + url, () =>
    assert.equal(safeURL(url), undefined),
  );
test('safe URL keeps project paths and normal web links', () => {
  assert.equal(safeURL('/posts/hello/'), '/posts/hello/');
  assert.equal(safeURL('https://astro.build/'), 'https://astro.build/');
});
for (const source of [
  '::link[Bad]{href="javascript:alert(1)"}',
  '::video[Bad]{provider="youtube" id="not-valid"}',
  ':::note[Bad]{onclick="alert(1)"}\ntext\n:::',
  ':::tabs\nnot a tab\n:::',
  ':::gallery\nnot an image\n:::',
  ':::unknown\nbody\n:::',
])
  test('component author errors fail clearly: ' + source.split('\n')[0], () =>
    assert.throws(() => parse(source)),
  );
test('nested Markdown remains structural, and Tabs use unique names per container', () => {
  const source =
    '::::details[说明]\n:::note[提示]\n**重要内容**\n:::\n::::\n\n::::tabs\n:::tab[npm]\n```sh\nnpm install\n```\n:::\n:::tab[pnpm]\n正文\n:::\n::::';
  const tree = parse(source);
  assert.equal(tree.children[0].data.hName, 'details');
  assert.equal(tree.children[0].children[1].children[0].data.hName, 'aside');
  const tabs = tree.children[1];
  assert.equal(tabs.data.hName, 'mdui-tabs');
  assert.equal(
    new Set(
      tabs.children
        .filter((n) => n.data?.hName === 'mdui-tab-panel')
        .map((n) => n.data.hProperties.id),
    ).size,
    2,
  );
});

test('inline colon notation remains literal prose', () => {
  const tree = parse('保留 :smile: 和 :inline[普通文本]。');
  const text = tree.children[0].children.map((node) => node.value).join('');
  assert.equal(text, '保留 :smile: 和 :inline[普通文本]。');
});
test('single-post component switches retain content without interactive widgets', () => {
  const source = '::::tabs[命令]\n:::tab[一种方式]\n保留正文\n:::\n::::';
  const tree = parse(source, { markdown: { components: false } });
  assert.equal(tree.children[0].data.hName, 'div');
  assert.equal(tree.children[0].children[0].data.hName, 'section');
});

test('documented eight-level component nesting limit is exact', () => {
  const nested = (levels) => {
    const fences = Array.from({ length: levels }, (_, i) =>
      ':'.repeat(levels - i + 2),
    );
    return (
      fences.map((fence) => fence + 'note[层]').join('\n') +
      '\n正文\n' +
      fences.toReversed().join('\n')
    );
  };
  assert.doesNotThrow(() => parse(nested(8)));
  assert.throws(() => parse(nested(9)), /at most 8 levels/);
});
