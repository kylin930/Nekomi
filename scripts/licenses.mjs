import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const packages = new Map();
function collect(name) {
  if (packages.has(name)) return;
  const directory = join('node_modules', name);
  const pkg = read(join(directory, 'package.json'));
  packages.set(name, { pkg, directory });
  for (const dependency of Object.keys(pkg.dependencies || {})) collect(dependency);
}
collect('mdui');
// Astro's client navigation is also distributed; its build dependencies are not.
packages.set('astro', { pkg: read('node_modules/astro/package.json'), directory: 'node_modules/astro' });
let output = 'Nekomi theme and browser dependency notices\n\n' + readFileSync('LICENSE', 'utf8');
for (const [name, { pkg, directory }] of packages) {
  const licenses = readdirSync(directory).filter(file => /^(license|licence|notice)(\.|$)/i.test(file));
  let content = licenses.map(file => readFileSync(join(directory, file), 'utf8')).join('\n');
  if (!content && name === '@lit-labs/ssr-dom-shim') {
    // This package ships SPDX/copyright in index.js but no standalone LICENSE.
    // Reproduce its declared BSD-3-Clause terms from the same upstream Lit repo.
    const header = readFileSync(join(directory, 'index.js'), 'utf8').match(/Copyright [^\n]+/)[0];
    content = readFileSync('node_modules/@lit/reactive-element/LICENSE', 'utf8').replace(/Copyright[^\n]+/, header);
  }
  if (!content) throw new Error(`Missing license text for ${name}; review before distribution.`);
  output += `\n\n${'='.repeat(72)}\n${name} ${pkg.version} (${pkg.license})\n${pkg.homepage || pkg.repository?.url || ''}\n\n${content}`;
}
writeFileSync('public/THIRD-PARTY-LICENSES.txt', output.replace(/\r\n?/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trimEnd() + '\n');
const manifest = read('package.json');
const rows = Object.keys(manifest.dependencies).map(name => {
  const pkg = read(join('node_modules', name, 'package.json'));
  return `| ${name} | ${pkg.version} | ${pkg.license} | ${name === 'astro' ? '静态构建与浏览器导航运行时' : name === 'mdui' ? '浏览器组件与主题功能' : '构建期，不加入浏览器依赖'} |`;
});
const lock = read('package-lock.json');
const buildSpecial = [...new Set(Object.entries(lock.packages).filter(([path, pkg]) => path && /LGPL|MPL/.test(pkg.license || '')).map(([path, pkg]) => `${path.split('node_modules/').at(-1)} (${pkg.license})`))].sort();
writeFileSync('docs/DEPENDENCIES.md', '# 依赖与发布许可检查\n\n由 `npm run licenses` 根据已安装锁定版本生成。主题代码 MIT 不改变第三方许可。浏览器 MDUI / Astro 及 MDUI 依赖的完整许可文本随静态产物一起发布在 `/THIRD-PARTY-LICENSES.txt`；目录为保守范围，可能包含本次按需组件未使用的依赖。图标字体由 Google Fonts 提供，另见 THIRD-PARTY-NOTICES.md。\n\n| 直接依赖 | 锁定版本 | 许可 | 分工 |\n| --- | --- | --- | --- |\n' + rows.join('\n') + '\n\n## 构建工具的特殊许可\n\nAstro 图片 / 构建依赖树含下列 LGPL / MPL 包（含可选平台二进制）。它们通过原 npm 包安装并保留各自许可，不复制进浏览器 JS；产物只含优化后的图片。不要把“主题 MIT”表述为整个 npm 依赖树全部 MIT。若重新分发构建工具或二进制，应遵守对应包的许可要求。\n\n' + buildSpecial.map(name => '- ' + name).join('\n') + '\n');
console.log(`Wrote browser notices for ${packages.size} packages and build dependency inventory.`);
