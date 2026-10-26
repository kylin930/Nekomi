/** @param {import('../../src/integrations/scripts/types').ScriptContext} context */
export function mount(context) {
  const note = document.createElement('p');
  note.textContent = '这是只在当前独立页面挂载的脚本示例。';
  note.dataset.pageScriptDemo = '';
  context.container.append(note);
  return () => note.remove();
}
