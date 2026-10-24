import test from 'node:test';
import assert from 'node:assert/strict';
import { socialIcon } from '../src/lib/social.mjs';
for (const [url, icon] of [
  ['https://github.com/', 'github'],
  ['https://gist.github.com/', 'github'],
  ['https://www.bilibili.com/', 'bilibili'],
  ['https://b23.tv/abc', 'bilibili'],
  ['mailto:hello@example.com', 'mail--outlined'],
  ['https://example.com/', 'link'],
  ['/about/', 'link'],
  ['https://github.com.fake.example/', 'link'],
  ['https://fakebilibili.com/', 'link'],
]) test('automatic social icon: ' + url, () => assert.equal(socialIcon({url}), icon));
test('explicit brands and existing Material names remain configurable', () => {
  assert.equal(socialIcon({url:'https://example.com/',icon:'bilibili'}), 'bilibili');
  assert.equal(socialIcon({url:'https://github.com/',icon:'code'}), 'code');
});
