import { existsSync, realpathSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
export function scriptsIntegration(settings) {
  return { name: 'nekomi-user-scripts', hooks: {
    'astro:config:setup': () => {
      for (const [scope, entries] of Object.entries(settings)) for (const [index, entry] of entries.entries()) {
        if (!entry.enabled || entry.src.startsWith('https://')) continue;
        const file = resolve('public', decodeURIComponent(entry.src.split('?')[0]).replace(/^\//, ''));
        if (!existsSync(file) || !statSync(file).isFile() || !realpathSync(file).startsWith(realpathSync('public') + sep)) throw new Error(`scripts.${scope}.${index}.src: local JavaScript must exist inside public/: ${entry.src}`);
      }
    },
  } };
}
