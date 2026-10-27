import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { resolveConfig } from '../src/config/schema.mjs';
import { validatePages, validPageSlug, pageTabId, sidebarSections } from '../src/lib/page-rules.mjs';
import { validScriptSource } from '../src/integrations/scripts/urls.mjs';
import { scriptsIntegration } from '../src/integrations/scripts/build.mjs';
import { commentKey } from '../src/integrations/comments/identity.ts';
import { rehypePageIds } from '../src/plugins/page-ids.mjs';
const page = (id, data = {}) => ({ id, data: { title: id, ...data } });
test('old configuration keeps the exact sidebar and navigation defaults', () => {
  const config = resolveConfig({ layout: { sidebarTabs: ['friends', 'updates'] } });
  assert.equal(config.layout.sidebarSections, null);
  assert.deepEqual(sidebarSections(config.layout), [{id:'friends',display:'tab'},{id:'updates',display:'tab'}]);
  assert.deepEqual(config.navigation.pageTabs, []);
  assert.deepEqual(config.scripts, { global: [], byPage: [] });
});
test('sections support independent ordering, all-standalone and empty states', () => {
  const sections = [{id:'friends',display:'standalone',position:'above'},{id:'comments',display:'tab'}];
  assert.deepEqual(sidebarSections(resolveConfig({layout:{sidebarSections:sections}}).layout),sections);
  assert.deepEqual(sidebarSections(resolveConfig({layout:{sidebarSections:[]}}).layout),[]);
  assert.equal(resolveConfig({layout:{sidebarSections:[{id:'updates',display:'standalone'}]}}).layout.sidebarSections[0].position,'below');
});
for (const input of ['posts','posts/x','page','friends','categories/a','tags','archive','404','__nekomi/x','_astro','about/','../about','a//b','https://example.com','a%2fb']) test(`reserved/invalid page path: ${input}`,()=>assert.equal(validPageSlug(input),false));
test('page routing uses explicit slug, filters drafts, validates enabled navigation', () => {
  assert.equal(pageTabId('recent'),'page-recent');
  assert.deepEqual(validatePages([page('one',{slug:'about'}),page('hidden',{draft:true})],[{slug:'about',enabled:true}]).map(p=>p.slug),['about']);
  assert.throws(()=>validatePages([page('one',{slug:'about'}),page('two',{slug:'About'})]),/Duplicate page slug/);
  assert.throws(()=>validatePages([page('posts')]),/reserved page slug/);
  assert.throws(()=>validatePages([page('hidden',{draft:true})],[{slug:'hidden',enabled:true}]),/missing or a draft/);
  assert.throws(()=>validatePages([],[{slug:'about',enabled:true}]),/navigation.pageTabs/);
  assert.doesNotThrow(()=>validatePages([],[{slug:'future',enabled:false}]));
});
test('page comments keep file identity and separate namespace when URL/title changes', () => {
  const c=resolveConfig({});
  assert.notEqual(commentKey(page('about'),c.comments.pageKeyPrefix),commentKey(page('about'),c.comments.keyPrefix));
  assert.equal(commentKey(page('new',{commentId:'old',slug:'elsewhere'}),c.comments.pageKeyPrefix),'/pages/old/');
});
const invalid = [
  [{layout:{sidebarSections:[{id:'friends',display:'tab'},{id:'friends',display:'standalone'}]}},/sidebarSections/],
  [{layout:{sidebarSections:[{id:'updates',display:'tab',position:'above'}]}},/sidebarSections/],
  [{navigation:{pageTabs:[{slug:'about',label:'A'},{slug:'about',label:'B'}]}},/pageTabs/],
  [{scripts:{global:[{src:'javascript:alert(1)'}]}},/scripts.global.0.src/],
  [{scripts:{global:[{src:'http://example.com/a.js'}]}},/scripts.global.0.src/],
  [{scripts:{global:[{src:'/a.js',code:'alert(1)'}]}},/scripts.global.0/],
  [{scripts:{global:[{src:'/a.js',integrity:'invalid'}]}},/integrity/],
  [{scripts:{global:[{src:'/a.js'},{src:'a.js'}]}},/Duplicate\/conflicting/],
  [{scripts:{global:[{src:'/a.js'}],byPage:[{src:'/a.js',path:'/about/'}]}},/Duplicate\/conflicting/],
  [{scripts:{byPage:[{src:'/a.js',path:'/about/?x'}]}},/scripts.byPage.0.path/],
];
for (const [index,[config,error]] of invalid.entries()) test(`invalid site feature config reports path ${index}`,()=>assert.throws(()=>resolveConfig(config),error));
test('script resources stay public, opt-in, and local files are checked before build', () => {
  for(const src of ['/js/a.js','js/a.mjs','https://cdn.example/module?v=1']) assert(validScriptSource(src));
  for(const src of ['//evil/a.js','/../a.js','/%2e%2e/a.js','data:text/javascript,alert(1)','https://u:p@evil/a.js','/a.css']) assert(!validScriptSource(src));
  const hook=scriptsIntegration(resolveConfig({scripts:{global:[{src:'/missing.js',enabled:false}]}}).scripts).hooks['astro:config:setup'];
  assert.doesNotThrow(hook);
  assert.throws(()=>scriptsIntegration(resolveConfig({scripts:{global:[{src:'/missing.js'}]}}).scripts).hooks['astro:config:setup'](),/scripts.global.0.src/);
});
test('page IDs and local links/ARIA are namespaced, normal post headings stay untouched',()=>{
  const tree={type:'root',children:[{type:'element',tagName:'h2',properties:{},children:[{type:'text',value:'Section'}]},{type:'element',tagName:'a',properties:{href:'#section',ariaControls:['section']},children:[]}]};
  const normal=structuredClone(tree);rehypePageIds()(normal,{path:resolve('src/content/posts/a.md'),data:{}});assert.equal(normal.children[0].properties.id,undefined);
  rehypePageIds()(tree,{path:resolve('src/content/pages/a.md'),history:[resolve('src/content/pages/a.md')],data:{astro:{}}});
  const id=tree.children[0].properties.id;assert.match(id,/^np-[a-f\d]+-section$/);assert.equal(tree.children[1].properties.href,'#'+id);assert.deepEqual(tree.children[1].properties.ariaControls,[id]);
});
