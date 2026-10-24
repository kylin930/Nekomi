import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const packages = new Map();
function packageDirectory(name, from = process.cwd()) {
  let current = resolve(from);
  while (true) {
    const directory = join(current, 'node_modules', name);
    try { read(join(directory, 'package.json')); return directory; } catch { /* Follow Node's package lookup to the parent. */ }
    const parent = dirname(current);
    if (parent === current) throw new Error(`Cannot resolve license package ${name} from ${from}`);
    current = parent;
  }
}
function collect(name, from) {
  const directory = packageDirectory(name, from);
  const pkg = read(join(directory, 'package.json'));
  const key = `${pkg.name}@${pkg.version}`;
  if (packages.has(key)) return;
  packages.set(key, { pkg, directory });
  for (const dependency of Object.keys(pkg.dependencies || {})) collect(dependency, directory);
}
['mdui', 'photoswipe', 'mermaid', 'katex'].forEach(name => collect(name));
// Astro's client navigation is also distributed; its build dependencies are not.
packages.set('astro', { pkg: read('node_modules/astro/package.json'), directory: 'node_modules/astro' });
let output = 'Nekomi theme and browser dependency notices\n\n' + readFileSync('LICENSE', 'utf8');
for (const [name, { pkg, directory }] of packages) {
  const licenses = readdirSync(directory).filter(file => /^(license|licence|notice)(\.|$)/i.test(file));
  let content = licenses.map(file => readFileSync(join(directory, file), 'utf8')).join('\n');
  if (!content && pkg.name === '@lit-labs/ssr-dom-shim') {
    // This package ships SPDX/copyright in index.js but no standalone LICENSE.
    // Reproduce its declared BSD-3-Clause terms from the same upstream Lit repo.
    const header = readFileSync(join(directory, 'index.js'), 'utf8').match(/Copyright [^\n]+/)[0];
    content = readFileSync('node_modules/@lit/reactive-element/LICENSE', 'utf8').replace(/Copyright[^\n]+/, header);
  }
  if (!content) throw new Error(`Missing license text for ${name}; review before distribution.`);
  if (pkg.name === 'elkjs') content = `Source code (unmodified upstream ${pkg.version}): https://github.com/kieler/elkjs/tree/${pkg.version}\nELK source and build inputs: https://github.com/eclipse/elk\n\n` + content;
  output += `\n\n${'='.repeat(72)}\n${pkg.name} ${pkg.version} (${pkg.license})\n${pkg.homepage || pkg.repository?.url || ''}\n\n${content}`;
}
output += '\n\nSimple Icons 15.1.0 — GitHub and Bilibili SVG icons (CC0-1.0)\nhttps://github.com/simple-icons/simple-icons/tree/15.1.0\n\n' + readFileSync('src/assets/icons/LICENSE.md', 'utf8');
writeFileSync('public/THIRD-PARTY-LICENSES.txt', output.replace(/\r\n?/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n');
const manifest = read('package.json');
const rows = Object.keys(manifest.dependencies).map(name => {
  const pkg = read(join('node_modules', name, 'package.json'));
  return `| ${name} | ${pkg.version} | ${pkg.license} | ${name === 'astro' ? '静态构建与浏览器导航运行时' : name === 'mdui' ? '浏览器组件与主题功能' : ['mermaid', 'photoswipe'].includes(name) ? '按文章 / 交互加载的浏览器扩展' : name === 'katex' ? '构建期公式渲染及浏览器 CSS / 字体' : '构建期，不加入浏览器依赖'} |`;
});
const lock = read('package-lock.json');
const buildSpecial = [...new Set(Object.entries(lock.packages).filter(([path, pkg]) => path && /LGPL|MPL/.test(pkg.license || '') && ![...packages.values()].some(item => item.pkg.name === path.split('node_modules/').at(-1) && item.pkg.version === pkg.version)).map(([path, pkg]) => `${path.split('node_modules/').at(-1)} (${pkg.license})`))].sort();
writeFileSync('docs/DEPENDENCIES.md', '# 依赖与发布许可检查\n\n由 `npm run licenses` 根据已安装锁定版本生成。主题代码 MIT 不改变第三方许可。浏览器 MDUI / Astro / Markdown 扩展及传递依赖的完整许可文本随静态产物一起发布在 `/THIRD-PARTY-LICENSES.txt`；目录为保守范围，可能包含本次按需组件未使用的依赖。图标字体由 Google Fonts 提供，另见 THIRD-PARTY-NOTICES.md。\n\n| 直接依赖 | 锁定版本 | 许可 | 分工 |\n| --- | --- | --- | --- |\n' + rows.join('\n') + '\n\n## 浏览器扩展的特殊许可\n\nMermaid 包含 DOMPurify（MPL-2.0 OR Apache-2.0）与 elkjs 0.9.3（EPL-2.0），均为未修改的上游依赖；完整许可随上述 notices 分发。ELK 的对应源代码和构建说明可从 https://github.com/kieler/elkjs/tree/0.9.3 及 https://github.com/eclipse/elk 获取。Nekomi 的独立主题代码仍为 MIT，不将整棵依赖树称为 MIT。\n\n## 构建工具的特殊许可\n\nAstro 图片 / 构建依赖树含下列 LGPL / MPL 包（含可选平台二进制）。它们通过原 npm 包安装并保留各自许可，不复制进浏览器 JS；产物只含优化后的图片。不要把“主题 MIT”表述为整个 npm 依赖树全部 MIT。若重新分发构建工具或二进制，应遵守对应包的许可要求。\n\n' + buildSpecial.map(name => '- ' + name).join('\n') + '\n');
console.log(`Wrote browser notices for ${packages.size} packages, 2 CC0 brand icons and build dependency inventory.`);
