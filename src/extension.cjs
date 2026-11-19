'use strict';

const vscode = require('vscode');
const engine = require('./theme-engine.cjs');

function activate(context) {
  const manifest = context.extension.packageJSON;
  const themes = manifest.contributes.themes;
  const themeIds = new Set(themes.flatMap(t => [t.id, t.label]));
  const log = vscode.window.createOutputChannel('Vira Local');
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.name = 'Vira Local accent';
  status.command = 'viraLocal.accentPicker';
  let disposed = false;
  let queue = Promise.resolve();
  context.subscriptions.push(log, status, {dispose() { disposed = true; }});

  function settings() {
    const config = vscode.workspace.getConfiguration('viraLocal');
    return engine.normalize(Object.fromEntries(Object.keys(engine.defaults).map(k => [k, config.get(k, engine.defaults[k])])));
  }

  // Match an existing workspace override; otherwise persist the user's choice in
  // the current VS Code profile. Unrelated settings and the original namespace stay untouched.
  async function update(section, key, value) {
    const config = vscode.workspace.getConfiguration(section);
    if (config.get(key) === value) return;
    const inspected = config.inspect(key);
    const target = inspected?.workspaceValue !== undefined
      ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
    await config.update(key, value, target);
  }

  async function apply() {
    if (disposed) return;
    const options = settings();
    const rendered = engine.renderAll(context.extensionPath, options);
    const workbench = vscode.workspace.getConfiguration('workbench');
    const selected = workbench.get('colorTheme');
    if (!themeIds.has(selected)) { status.hide(); return; }
    if (options.syncThemesAndIcons) {
      const variant = selected.replace(/^Local Vira /, '').replace(/ High Contrast$/, '').toLowerCase();
      await update('workbench', 'iconTheme', 'vira-local-icons-' + variant);
    }
    if (options.syncProductIcons) {
      await update('workbench', 'productIconTheme', options.useOutlinedIcons ? 'vira-local-outline' : 'vira-local-solid');
    }
    status.text = `$(paintcan) ${options.customAccent || options.accent}`;
    status.tooltip = `Vira Local · ${rendered.accent} · ${options.accentIntensity}`;
    status.show();
    if (rendered.changed.length) log.appendLine(`Updated ${rendered.changed.length} local theme files (${rendered.accent}).`);
  }

  function schedule() {
    queue = queue.then(apply).catch(error => {
      log.appendLine(error.stack || String(error));
      void vscode.window.showErrorMessage(`Vira Local : ${error.message}`);
    });
    return queue;
  }

  function register(name, callback) {
    context.subscriptions.push(vscode.commands.registerCommand('viraLocal.' + name, callback));
  }

  register('openSettings', () => vscode.commands.executeCommand('workbench.action.openSettings', '@ext:hedi-local.vira-local'));
  register('openWalkthrough', () => vscode.commands.executeCommand('workbench.action.openWalkthrough', 'hedi-local.vira-local#viraLocal.getStarted', false));
  register('openOutlinedIconsSetting', () => vscode.commands.executeCommand('workbench.action.openSettings', 'viraLocal.useOutlinedIcons'));
  register('openColorThemePicker', async value => {
    const choice = value ?? (await vscode.window.showQuickPick(themes.map(t => ({label:t.label, value:t.id})), {
      title:'Vira Local — Color Theme', placeHolder:'Choisir une palette locale'
    }))?.value;
    if (choice === undefined) return;
    if (!themeIds.has(choice)) throw new Error('Unknown Vira Local color theme');
    await update('workbench', 'colorTheme', choice);
    await schedule();
  });
  register('accentPicker', async value => {
    let choice = value;
    if (choice === undefined) {
      const o = settings();
      const items = Object.keys(engine.accents).map(name => ({label:name, description:engine.accents[name][o.accentIntensity], value:name}));
      items.push({label:'Custom…', description:'Couleur hexadécimale', value:'custom'}, {label:'Clear custom accent', value:'clear'});
      choice = (await vscode.window.showQuickPick(items, {title:'Vira Local — Accent Color'}))?.value;
    }
    if (choice === undefined) return;
    if (choice === 'custom') {
      choice = await vscode.window.showInputBox({title:'Vira Local — Custom Accent', prompt:'#RRGGBB',
        value:settings().customAccent || engine.accentColor(settings()),
        validateInput:value => /^#[a-f\d]{6}$/i.test(value) ? undefined : 'Utilise une couleur à six chiffres, par exemple #80CBC4.'});
      if (choice === undefined) return;
    }
    if (choice === 'clear') await update('viraLocal', 'customAccent', '');
    else if (typeof choice === 'string' && /^#[a-f\d]{6}$/i.test(choice)) await update('viraLocal', 'customAccent', choice.toUpperCase());
    else if (Object.hasOwn(engine.accents, choice)) {
      await update('viraLocal', 'accent', choice);
      await update('viraLocal', 'customAccent', '');
    } else throw new Error('Unknown accent or invalid #RRGGBB color');
    await schedule();
  });
  register('accentIntensityPicker', async value => {
    const choice = value ?? (await vscode.window.showQuickPick(['soft','normal','vivid'], {title:'Vira Local — Accent Intensity'}));
    if (choice === undefined) return;
    if (!['soft','normal','vivid'].includes(choice)) throw new Error('Unknown accent intensity');
    await update('viraLocal', 'accentIntensity', choice);
    await schedule();
  });
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('viraLocal') || event.affectsConfiguration('workbench.colorTheme')) void schedule();
  }));
  void schedule();
  return {whenIdle: () => queue};
}

exports.activate = activate;
