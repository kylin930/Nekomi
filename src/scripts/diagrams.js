import { say } from './ui';
import { isContentVisible } from './content-target';
let library;
let queue = Promise.resolve();
const engine = () =>
  (library ||= import('mermaid')
    .then((module) => module.default)
    .catch((error) => {
      library = undefined;
      throw error;
    }));
export function initDiagrams(body, signal) {
  const diagrams = [...body.querySelectorAll('[data-md-mermaid]')];
  let generation = 0,
    counter = 0;
  const requested = new Set();
  const scheduled = new WeakMap();
  async function draw(figure) {
    if (signal.aborted || !isContentVisible(figure)) return;
    requested.add(figure);
    const turn = generation;
    scheduled.set(figure, turn);
    const source = figure.querySelector('[data-mermaid-code] code').textContent;
    const output = figure.querySelector('[data-mermaid-render]'),
      status = figure.querySelector('[data-mermaid-status]'),
      retry = figure.querySelector('[data-mermaid-retry]'),
      details = figure.querySelector('details');
    retry.hidden = true;
    status.textContent = say('markdown', 'diagramLoading');
    queue = queue
      .catch(() => {})
      .then(async () => {
        if (signal.aborted || turn !== generation) return;
        let scratch;
        try {
          if (
            source.length > 20000 ||
            /%%\s*\{/.test(source) ||
            /^\s*---/.test(source)
          )
            throw new Error('Inline Mermaid configuration is disabled.');
          const mermaid = await engine();
          if (signal.aborted || turn !== generation) return;
          const style = getComputedStyle(document.body),
            color = (name) =>
              'rgb(' +
              style.getPropertyValue('--mdui-color-' + name).trim() +
              ')';
          const dark =
            document.documentElement.classList.contains('mdui-theme-dark') ||
            (document.documentElement.classList.contains('mdui-theme-auto') &&
              matchMedia('(prefers-color-scheme: dark)').matches);
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            suppressErrorRendering: true,
            maxTextSize: 20000,
            maxEdges: 200,
            theme: 'base',
            darkMode: dark,
            fontFamily: style.fontFamily,
            secure: [
              'secure',
              'securityLevel',
              'startOnLoad',
              'suppressErrorRendering',
              'maxTextSize',
              'maxEdges',
              'theme',
              'themeCSS',
              'themeVariables',
              'flowchart',
              'fontFamily',
            ],
            flowchart: { htmlLabels: false, useMaxWidth: true },
            sequence: { useMaxWidth: true },
            themeVariables: {
              darkMode: dark,
              primaryColor: color('primary-container'),
              primaryTextColor: color('on-primary-container'),
              primaryBorderColor: color('primary'),
              lineColor: color('on-surface-variant'),
              secondaryColor: color('secondary-container'),
              tertiaryColor: color('surface-container'),
              background: color('surface'),
              mainBkg: color('surface-container'),
              textColor: color('on-surface'),
              nodeTextColor: color('on-surface'),
            },
          });
          scratch = document.createElement('div');
          scratch.className = 'mermaid-scratch';
          scratch.setAttribute('aria-hidden', 'true');
          scratch.style.width = figure.clientWidth + 'px';
          figure.append(scratch);
          const id =
            'nekomi-diagram-' + Date.now().toString(36) + '-' + ++counter;
          const result = await mermaid.render(id, source, scratch);
          if (signal.aborted || turn !== generation) return;
          output.innerHTML = result.svg; // Mermaid strict mode sanitizes its own generated SVG; HTML labels are disabled.
          const svg = output.querySelector('svg');
          if (!svg) throw new Error('Missing diagram');
          svg.style.maxWidth = 'none';
          svg.style.width = svg.viewBox.baseVal.width + 'px';
          output.hidden = false;
          output.tabIndex = 0;
          figure.dataset.renderedTheme = dark ? 'dark' : 'light';
          status.textContent = '';
          details.open = false;
          document.dispatchEvent(new Event('nekomi:content-change'));
        } catch {
          if (!signal.aborted && turn === generation) {
            output.hidden = true;
            status.textContent = say('markdown', 'diagramFailed');
            retry.hidden = false;
            details.open = true;
          }
        } finally {
          scratch?.remove();
        }
      });
    await queue;
  }
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries)
              if (entry.isIntersecting && isContentVisible(entry.target)) {
                observer.unobserve(entry.target);
                void draw(entry.target);
              }
          },
          { rootMargin: '200px' },
        )
      : null;
  for (const figure of diagrams) {
    if (observer) observer.observe(figure);
    else void draw(figure);
    figure
      .querySelector('[data-mermaid-retry]')
      .addEventListener('click', () => void draw(figure), { signal });
  }
  const theme = () => {
    ++generation;
    for (const figure of requested) void draw(figure);
  };
  const reveal = () => {
    for (const figure of requested)
      if (scheduled.get(figure) !== generation) void draw(figure);
  };
  document.addEventListener('nekomi:content-change', reveal, { signal });
  body.addEventListener('toggle', reveal, { signal, capture: true });
  document.addEventListener('nekomi:theme', theme, { signal });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', theme, {
    signal,
  });
  signal.addEventListener(
    'abort',
    () => {
      ++generation;
      observer?.disconnect();
      body
        .querySelectorAll('.mermaid-scratch')
        .forEach((node) => node.remove());
    },
    { once: true },
  );
}
