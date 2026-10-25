import { createHash } from 'node:crypto';
import rehypeKatex from 'rehype-katex';
import { message } from '../config/messages.mjs';
import { rawConfig } from '../config/publishing.mjs';
export const text = (value) => ({ type: 'text', value });
const block = (tag, props = {}, children = []) => ({
  type: 'paragraph',
  data: { hName: tag, hProperties: props },
  children,
});
const plain = (node) =>
  node.type === 'text' || node.type === 'inlineCode'
    ? node.value
    : (node.children || []).map(plain).join('');
const kinds = { note: 'lightbulb--outlined', info: 'info--outlined', tip: 'lightbulb--outlined', success: 'check_circle--outlined', warning: 'warning_amber', danger: 'error--outlined' };
const ui = rawConfig.ui;
export function safeURL(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    /[\u0000-\u0020\u007f\\]/.test(value)
  )
    return;
  if (/^(?:\/(?!\/)|#)/.test(value)) return value;
  try {
    const url = new URL(value);
    if (
      ['https:', 'http:', 'mailto:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {
    /* Invalid author URL. */
  }
}
function label(node) {
  if (node.type !== 'containerDirective') return plain(node);
  if (node.children[0]?.data?.directiveLabel)
    return plain(node.children.shift());
  return '';
}
function check(node, allowed, file) {
  for (const name of Object.keys(node.attributes || {}))
    if (!allowed.includes(name))
      file.fail(`Unknown ${node.name} attribute: ${name}`, node);
}
export function remarkComponents() {
  return (tree, file) => {
    const options = {
      ...rawConfig.markdown,
      ...file.data.astro?.frontmatter?.markdown,
    };
    let tabCount = 0;
    function visit(node, depth = 0, tabsDepth = 0) {
      if (node.type === 'math' || node.type === 'inlineMath') {
        if (!options.math) {
          node.value =
            (node.type === 'math' ? '$$\n' : '$') +
            node.value +
            (node.type === 'math' ? '\n$$' : '$');
          node.type = 'text';
          delete node.data;
        }
        return;
      }
      // Inline colon text is not one of our block components. Preserve it
      // literally (e.g. :smile:) so enabling directives does not break prose.
      if (node.type === 'textDirective') {
        node.type = 'text';
        node.value = String(file.value).slice(
          node.position.start.offset,
          node.position.end.offset,
        );
        delete node.children;
        return;
      }
      if (node.type?.endsWith('Directive') && !node.data?.nekomiHandled) {
        if (depth >= 8)
          file.fail('Markdown components may nest at most 8 levels.', node);
        const title = label(node),
          attrs = node.attributes || {},
          body = node.type === 'containerDirective';
        if (kinds[node.name]) {
          check(node, ['icon'], file);
          if (!body) file.fail('Use :::' + node.name + ' for a callout.', node);
          const fallback = ui.markdown[node.name === 'tip' ? 'note' : node.name], icon = kinds[node.name];
          if (attrs.icon && !/^[\w-]+$/.test(attrs.icon))
            file.fail('Use a Material icon name.', node);
          node.data = {
            hName: 'aside',
            hProperties: {
              className: options.components ? ['md-callout'] : [],
              'data-kind': node.name === 'tip' ? 'note' : node.name,
            },
          };
          node.children.unshift(
            block('p', { className: ['md-callout-title'] }, [
              block('mdui-icon', {
                name: attrs.icon || icon,
                ariaHidden: 'true',
              }),
              block('strong', {}, [text(title || fallback)]),
            ]),
          );
        } else if (node.name === 'details') {
          check(node, ['open'], file);
          if (!body) file.fail('Use :::details.', node);
          node.data = {
            hName: 'details',
            hProperties: { className: ['md-details'], open: 'open' in attrs },
          };
          node.children = [
            block('summary', {}, [text(title || ui.markdown.details)]),
            block('div', { className: ['md-details-body'] }, node.children),
          ];
        } else if (node.name === 'gallery') {
          check(node, [], file);
          if (!body) file.fail('Use :::gallery with Markdown images.', node);
          const images = node.children.flatMap((child) =>
            child.type === 'paragraph'
              ? child.children.filter(
                  (n) => !(n.type === 'text' && !n.value.trim()),
                )
              : [child],
          );
          if (
            images.some(
              (n) =>
                !['image', 'imageReference'].includes(n.type) &&
                !(
                  n.type === 'link' &&
                  n.children.length === 1 &&
                  ['image', 'imageReference'].includes(n.children[0].type)
                ),
            )
          )
            file.fail(
              'A gallery may only contain Markdown images or linked images.',
              node,
            );
          node.data = {
            hName: 'div',
            hProperties: {
              className: options.components ? ['md-gallery'] : [],
              'aria-label': title || ui.markdown.gallery,
            },
          };
          node.children = images.map((image) => {
            const picture = image.type === 'link' ? image.children[0] : image;
            const caption = picture.title || picture.alt;
            return block('figure', {}, [
              image,
              ...(caption ? [block('figcaption', {}, [text(caption)])] : []),
            ]);
          });
        } else if (node.name === 'link') {
          check(node, ['href', 'description'], file);
          if (body) file.fail('Use ::link[标题]{href="…"}.', node);
          const href = safeURL(attrs.href);
          if (!href)
            file.fail(
              'Link cards require a safe HTTP(S), mailto or site-relative href.',
              node,
            );
          node.data = {
            hName: options.components ? 'mdui-card' : 'div',
            hProperties: { variant: 'outlined', className: ['md-link-card'] },
          };
          node.children = [
            {
              type: 'link',
              url: href,
              data: {
                hProperties: {
                  ...(href.startsWith('http')
                    ? { target: '_blank', rel: ['noopener', 'noreferrer'] }
                    : {}),
                  className: ['md-link-card-body'],
                },
              },
              children: [
                block('strong', {}, [text(title || href)]),
                ...(attrs.description
                  ? [block('span', {}, [text(attrs.description)])]
                  : []),
                block('span', { className: ['md-link-address'] }, [text(href)]),
              ],
            },
          ];
        } else if (node.name === 'video') {
          check(node, ['provider', 'id'], file);
          if (body) file.fail('Use ::video[标题]{provider="…" id="…"}.', node);
          const provider = attrs.provider,
            id = attrs.id;
          if (
            !(
              (provider === 'youtube' && /^[\w-]{11}$/.test(id || '')) ||
              (provider === 'bilibili' && /^BV[\w]{10}$/.test(id || ''))
            )
          )
            file.fail(
              'Video requires youtube (11-character ID) or bilibili (BV ID).',
              node,
            );
          const href =
            provider === 'youtube'
              ? 'https://www.youtube.com/watch?v=' + id
              : 'https://www.bilibili.com/video/' + id + '/';
          const name = provider === 'youtube' ? 'YouTube' : 'Bilibili';
          node.data = {
            hName: 'figure',
            hProperties: {
              className: ['md-video'],
              ...(options.components
                ? { 'data-md-video': provider, 'data-video-id': id }
                : {}),
            },
          };
          node.children = [
            block('figcaption', {}, [text(title || message(ui.markdown.video, { provider: name }))]),
            block('p', {}, [text(message(ui.markdown.videoPrivacy, { provider: name }))]),
            ...(options.components
              ? [
                  block(
                    'mdui-button',
                    { variant: 'tonal', 'data-video-load': '', hidden: true },
                    [text(message(ui.markdown.videoLoad, { provider: name }))],
                  ),
                ]
              : []),
            {
              type: 'link',
              url: href,
              data: {
                hProperties: {
                  target: '_blank',
                  rel: ['noopener', 'noreferrer'],
                },
              },
              children: [text(message(ui.markdown.videoOpen, { provider: name }))],
            },
          ];
        } else if (node.name === 'tabs') {
          check(node, [], file);
          if (!body || tabsDepth >= 2)
            file.fail(
              'Use a tabs container; content Tabs may nest at most twice.',
              node,
            );
          if (
            !node.children.length ||
            node.children.some(
              (child) =>
                child.type !== 'containerDirective' || child.name !== 'tab',
            )
          )
            file.fail('Tabs must contain only :::tab[标签] containers.', node);
          const id =
              'md-tabs-' +
              createHash('sha256')
                .update(String(file.value || file.path || 'content'))
                .digest('hex')
                .slice(0, 8) +
              '-' +
              ++tabCount,
            children = [];
          node.children.forEach((child, index) => {
            check(child, [], file);
            const title = label(child);
            if (!title) file.fail('Each tab requires a label.', child);
            const value = 'panel-' + (index + 1),
              tabId = id + '-tab-' + index,
              panelId = id + '-panel-' + index;
            if (options.components)
              children.push(
                block(
                  'mdui-tab',
                  { value, id: tabId, role: 'tab', 'aria-controls': panelId },
                  [text(title)],
                ),
              );
            child.data = {
              nekomiHandled: true,
              hName: options.components ? 'mdui-tab-panel' : 'section',
              hProperties: {
                slot: 'panel',
                value,
                id: panelId,
                role: options.components ? 'tabpanel' : undefined,
                ...(options.components
                  ? { 'aria-labelledby': tabId }
                  : { 'aria-label': title }),
                ...(options.components && index > 0 ? { hidden: true } : {}),
              },
            };
            child.children.unshift(
              block('p', { className: ['md-tab-fallback'] }, [
                block('strong', {}, [text(title)]),
              ]),
            );
            children.push(child);
          });
          node.data = {
            hName: options.components ? 'mdui-tabs' : 'div',
            hProperties: {
              className: ['md-tabs'],
              id,
              value: 'panel-1',
              variant: 'secondary',
              'aria-label': title || ui.markdown.tabs,
              ...(options.components ? { 'data-md-tabs': '' } : {}),
            },
          };
          node.children = children;
          if (options.components)
            node.children.push({
              type: 'html',
              value:
                '<noscript><style>.md-tabs mdui-tab{display:none!important}.md-tabs mdui-tab-panel[hidden],.md-tabs mdui-tab-panel{display:block!important}.md-tab-fallback{display:block!important}</style></noscript>',
            });
          tabsDepth++;
        } else file.fail('Unknown Markdown component: ' + node.name, node);
        depth++;
      }
      node.children?.forEach((child) => visit(child, depth, tabsDepth));
    }
    visit(tree);
  };
}
const element = (tagName, properties = {}, children = []) => ({
  type: 'element',
  tagName,
  properties,
  children,
});
export function rehypeFeatures() {
  const katex = rehypeKatex({
    throwOnError: false,
    strict: 'warn',
    trust: false,
    maxExpand: 1000,
    output: 'htmlAndMathml',
  });
  return (tree, file) => {
    const options = {
      ...rawConfig.markdown,
      ...file.data.astro?.frontmatter?.markdown,
    };
    if (options.math) katex(tree, file);
    const features = { math: false, mermaid: false, components: false };
    function visit(node) {
      const classes = node.properties?.className || [];
      if (
        options.components &&
        classes.some((name) =>
          [
            'md-callout',
            'md-details',
            'md-gallery',
            'md-tabs',
            'md-video',
            'md-link-card',
          ].includes(name),
        )
      )
        features.components = true;
      if (classes.includes('katex')) features.math = true;
      if (classes.includes('katex-display'))
        Object.assign(node.properties, {
          tabIndex: 0,
          role: 'region',
          'aria-label': ui.markdown.mathRegion,
        });
      if (
        node.tagName === 'pre' &&
        options.mermaid &&
        (node.properties.dataLanguage === 'mermaid' ||
          node.properties['data-language'] === 'mermaid' ||
          node.children?.some(
            (n) =>
              n.tagName === 'code' &&
              n.properties?.className?.includes('language-mermaid'),
          ))
      ) {
        features.mermaid = true;
        // Preserve the original code and a native no-script / parse-failure fallback.
        node.properties['data-mermaid-code'] = '';
        return element(
          'figure',
          { className: ['md-mermaid'], 'data-md-mermaid': '' },
          [
            element('div', {
              className: ['mermaid-render'],
              'data-mermaid-render': '',
              role: 'region',
              'aria-label': ui.markdown.diagramRegion,
              hidden: true,
            }),
            element('p', { 'data-mermaid-status': '', role: 'status' }, [
              {
                type: 'text',
                value: ui.markdown.diagramIdle,
              },
            ]),
            element(
              'mdui-button',
              { variant: 'text', 'data-mermaid-retry': '', hidden: true },
              [text(ui.markdown.diagramRetry)],
            ),
            element('details', { className: ['mermaid-source'], open: true }, [
              element('summary', {}, [text(ui.markdown.diagramSource)]),
              node,
            ]),
          ],
        );
      }
      if (node.children)
        node.children = node.children.map((child) => visit(child) || child);
    }
    visit(tree);
    file.data.astro.frontmatter.nekomiFeatures = features;
  };
}
