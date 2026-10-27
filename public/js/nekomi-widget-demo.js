/** @param {import('../../src/integrations/scripts/types').ScriptContext} context */
export function mount(context) {
  const note = document.createElement('p');
  note.textContent = '自定义全站脚本示例';
  note.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:10;margin:0;font-size:12px;color:inherit;pointer-events:none';
  context.container.append(note);
  context.on(window, 'nekomi:demo', () => { note.textContent = '示例事件已响应'; });
  return () => note.remove();
}
