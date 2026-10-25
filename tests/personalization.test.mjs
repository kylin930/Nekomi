import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveConfig } from '../src/config/schema.mjs';
import { createFormatters } from '../src/lib/formatting.mjs';
import { normalizeCategory, categoryRole, categoryColors } from '../src/lib/categories.mjs';
import { relatedPosts, excerptText } from '../src/lib/reading.mjs';
import { message } from '../src/config/messages.mjs';

test('old configs retain Chinese defaults without selecting category names', () => {
  const c = resolveConfig({});
  assert.equal(c.publishing.timeZone, 'Asia/Shanghai');
  assert.equal(c.ui.sidebar.updates, '最近更新');
  assert.equal(c.content.categoryPreviewLimit, 3);
  assert.equal(c.content.archivePreviewLimit, 3);
  assert.deepEqual(c.content.categoryColors, {});
  assert.deepEqual(c.appearance.webFonts, []);
  assert.deepEqual(c.navigation.topLinks, []);
  for (const name of ['设计', '日常', '工程', 'Music', 'constructor']) assert.equal(categoryRole(name), 'primary');
  assert.equal(resolveConfig({ publishing: { language: 'en-GB' } }).ui.sidebar.updates, '最近更新');
});
test('category roles are portable, custom sources deduplicate, and tokens have safe names', () => {
  const map = { Music: 'tertiary', Plants: '#FA893A', Travel: '#fa893a', Notes: 'secondary' };
  assert.equal(categoryRole('Music', map), 'tertiary');
  assert.equal(categoryRole('Plants', map), 'category-fa893a');
  assert.deepEqual(categoryColors(map), [{ name: 'category-fa893a', value: '#fa893a' }]);
});
for (const language of ['zh-CN', 'en-GB', 'ja-JP']) for (const timeZone of ['America/Los_Angeles', 'Pacific/Kiritimati'])
  test(`calendar dates ignore instant conversions: ${language} ${timeZone}`, () => {
    const f = createFormatters({ language, timeZone });
    const stamp = new Date('2026-01-01T00:00:00Z');
    assert.equal(f.dateLabel('2026-01-01'), new Intl.DateTimeFormat(language, { year:'numeric', month:'long', day:'numeric', timeZone:'UTC' }).format(stamp));
    assert.equal(f.monthLabel('2026-01'), new Intl.DateTimeFormat(language, { year:'numeric', month:'long', timeZone:'UTC' }).format(stamp));
    assert.equal(f.commentTime(stamp), new Intl.DateTimeFormat(language, { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', timeZone }).format(stamp));
  });
test('copyright year follows configured zone at the year boundary', () => {
  const stamp = new Date('2026-01-01T01:00:00Z');
  assert.equal(createFormatters({timeZone:'America/New_York'}).currentYear(stamp), 2025);
  assert.equal(createFormatters({timeZone:'Asia/Shanghai'}).currentYear(stamp), 2026);
});
test('default category display is independent of recommendation identity, including legacy data', () => {
  const item = (id, raw, fallback = 'General') => ({ id, data: { ...normalizeCategory(raw, fallback), date:'2026-01-01', tags:[], demo:false } });
  const a=item('a',undefined), b=item('b','未分类','Inbox'), c=item('c','General');
  assert.equal(a.data.category, 'General'); assert.equal(a.data.categoryKey, null);
  assert.equal(b.data.category, 'Inbox'); assert.equal(b.data.categoryKey, null);
  assert.equal(normalizeCategory(null,'Inbox').categoryKey,null);
  assert.equal(relatedPosts(a,[b,c]).length,0);
  assert.equal(relatedPosts(c,[item('d','General')]).length,1);
  b.data.tags=['shared']; a.data.tags=['shared'];
  assert.equal(relatedPosts(a,[b]).length,1);
});
test('partial UI overrides keep defaults, templates remain plain text, and old empty-state fields survive', () => {
  const c=resolveConfig({ui:{sidebar:{friends:'Neighbors'},search:{results:'Found {count}: {query}'}},home:{emptyTitle:'No entries'}});
  assert.equal(c.ui.sidebar.updates,'最近更新');
  assert.equal(c.home.emptyTitle,'No entries');
  assert.equal(message(c.ui.search.results,{count:2,query:'<script>'}),'Found 2: <script>');
});
for (const [value, path] of [
  [{publishing:{timeZone:'Mars/Olympus'}},'publishing.timeZone'],
  [{content:{categoryColors:{Travel:'red'}}},'content.categoryColors.Travel'],
  [{content:{categoryPreviewLimit:13}},'content.categoryPreviewLimit'],
  [{content:{archivePreviewLimit:-1}},'content.archivePreviewLimit'],
  [{content:{defaultCategory:''}},'content.defaultCategory'],
  [{ui:{search:{results:'No count token {query}'}}},'ui.search.results'],
  [{ui:{sidebar:{friends:''}}},'ui.sidebar.friends'],
  [{ui:{sidebar:{typo:'Unknown'}}},'ui.sidebar'],
  [{appearance:{webFonts:[{family:'Bad; color:red',src:'/font.woff2'}]}},'appearance.webFonts.0.family'],
  [{appearance:{webFonts:[{family:'Good',src:'javascript:alert(1).woff2'}]}},'appearance.webFonts.0.src'],
  [{appearance:{webFonts:[{family:'Good',src:'/font.ttf'}]}},'appearance.webFonts.0.src'],
  [{appearance:{webFonts:[{family:'Good',src:'/font.woff2',weight:'900 100'}]}},'appearance.webFonts.0.weight'],
  [{navigation:{topLinks:[{label:'X',url:'javascript:alert(1)'}]}},'navigation.topLinks.0.url'],
]) test(`invalid personalization includes field path: ${path}`,()=>assert.throws(()=>resolveConfig(value), new RegExp(String(path).replaceAll('.','\\.'))));
test('zero previews and disabled links are valid, without deleting any content', () => {
  const c=resolveConfig({content:{categoryPreviewLimit:0,archivePreviewLimit:0},navigation:{topLinks:[{label:'Friends',url:'/friends/',enabled:false}]},appearance:{webFonts:[{family:'Audit',src:'/fonts/audit.woff2',weight:'100 900'}]}});
  assert.equal(c.content.categoryPreviewLimit,0);
  assert.equal(c.navigation.topLinks[0].enabled,false);
  assert.equal(c.appearance.webFonts[0].preload,false);
});
test('automatic excerpts are Markdown text, not directive syntax, without spacing out Chinese prose', () => {
  const source='中文**正文**与`npm`命令。\n\n:::note[说明]\n保留[链接文字](https://example.com)与正文。\n:::\n\n```js\nsecretCode();\n```\n\n保留 :smile:。';
  const text=excerptText(source);
  assert.ok(text.includes('中文正文与npm命令。'));
  assert.ok(text.includes('链接文字'));
  assert.ok(text.includes(':smile:'));
  assert.ok(!/:::|secretCode|https:/.test(text));
});
