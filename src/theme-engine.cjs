'use strict';

// Pure renderers start from untouched recovered templates on every update.
const fs = require('node:fs');
const path = require('node:path');
const defaults = require('../config/defaults.json');
const accents = require('../config/accents.json');
const capturedColors = require('../config/captured-colors.json');
const clone = value => JSON.parse(JSON.stringify(value));

function normalize(input = {}) {
  const result = {...defaults};
  for (const key of Object.keys(defaults)) {
    if (typeof input[key] === typeof defaults[key]) result[key] = input[key];
  }
  if (!Object.hasOwn(accents, result.accent)) result.accent = defaults.accent;
  if (!['soft', 'normal', 'vivid'].includes(result.accentIntensity)) result.accentIntensity = defaults.accentIntensity;
  if (!/^#[a-f\d]{6}$/i.test(result.customAccent)) result.customAccent = '';
  return result;
}

function accentColor(options) {
  const o = normalize(options);
  return (o.customAccent || accents[o.accent][o.accentIntensity]).toUpperCase();
}

function contrastForeground(hex) {
  const channels = hex.slice(1).match(/../g).map(c => parseInt(c, 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

function recolorSvg(svg, accent) {
  // Two upstream glyphs express the mint swatch in Display P3 instead of hex.
  return svg.replace(/#80cbc4|color\(display-p3\s+\.502\s+\.7961\s+\.7686\)/gi, accent);
}

function renderTheme(template, options) {
  const o = normalize(options);
  const theme = clone(template);
  const c = theme.colors = {...theme.colors, ...capturedColors};
  const accent = accentColor(o);
  for (const [key, value] of Object.entries(c)) {
    if (!key.startsWith('terminal.ansi') && typeof value === 'string') {
      c[key] = value.replace(/^#80cbc4/i, accent);
    }
  }
  for (const key of ['button.foreground', 'activityBarBadge.foreground', 'statusBarItem.remoteHoverForeground']) {
    c[key] = contrastForeground(accent);
  }
  if (o.useTopTabIndicator) {
    c['tab.activeBorder'] = c['tab.unfocusedActiveBorder'] = accent + '00';
    c['tab.activeBorderTop'] = c['tab.unfocusedActiveBorderTop'] = accent;
  }
  if (o.showBorders) {
    const border = (template.colors['surface.border'] || '#2D314399').slice(0, 7);
    for (const key of ['sideBar.border', 'sideBarSectionHeader.border', 'sideBarStickyScroll.border',
      'panel.border', 'activityBar.border', 'sideBarActivityBarTop.border', 'statusBar.border',
      'titleBar.border', 'editorGroup.border', 'editorGroupHeader.tabsBorder', 'tab.border', 'surface.border']) c[key] = border;
  }
  if (o.contrastedTabs) {
    const background = template.colors['sideBar.background'] || template.colors['editor.background'];
    c['editorGroupHeader.tabsBackground'] = background;
    c['tab.inactiveBackground'] = background;
    c['tab.unfocusedInactiveBackground'] = background;
  }
  if (o.solidLineHighlight) {
    c['editor.lineHighlightBackground'] = (template.colors['editor.lineHighlightBorder'] || '#2D314399').slice(0, 7);
    c['editor.lineHighlightBorder'] = '#00000000';
  }
  if (o.hidesShadows) {
    for (const key of Object.keys(c).filter(k => /shadow/i.test(k))) c[key] = '#00000000';
    c['widget.shadow'] = c['scrollbar.shadow'] = '#00000000';
  }
  if (o.disableItalics) {
    for (const rule of theme.tokenColors || []) {
      if (typeof rule.settings?.fontStyle === 'string') {
        rule.settings.fontStyle = rule.settings.fontStyle.split(/\s+/).filter(s => s !== 'italic').join(' ');
      }
    }
    for (const rule of Object.values(theme.semanticTokenColors || {})) {
      if (typeof rule === 'object' && rule !== null) {
        if (Object.hasOwn(rule, 'italic')) rule.italic = false;
        if (typeof rule.fontStyle === 'string') rule.fontStyle = rule.fontStyle.split(/\s+/).filter(s => s !== 'italic').join(' ');
      }
    }
  }
  return theme;
}

function renderIcons(template, options, variant, writeCustom = () => {},
  assetExists = file => fs.existsSync(path.resolve(__dirname, '../build/themes', file))) {
  const o = normalize(options);
  const result = clone(template);
  const style = o.useOutlinedIcons ? 'outlined' : 'filled';
  const accent = accentColor(o);
  result.hidesExplorerArrows = o.hidesExplorerArrows;
  for (const [id, definition] of Object.entries(result.iconDefinitions)) {
    if (!definition.iconPath?.includes('/folders/')) continue;
    definition.iconPath = definition.iconPath.replace('/filled/', `/${style}/`);
    if (!id.endsWith('_open')) continue;
    if (!o.folderAccentMode) {
      const closedId = id === '_folder_open' ? '_folder_dark'
        : id === '_folder_root_open' ? '_folder_root_dark' : id.slice(0, -5);
      const closedPath = template.iconDefinitions[closedId]?.iconPath;
      if (!closedPath) throw new Error(`Missing closed folder definition: ${id} (${variant})`);
      definition.iconPath = closedPath.replace('/filled/', `/${style}/`);
    } else if (o.customAccent) {
      // A distinct filename avoids stale SVG caches and lets all windows finish old reads.
      const original = definition.iconPath;
      const filename = `${path.basename(original, '.svg')}.${accent.slice(1).toLowerCase()}.svg`;
      definition.iconPath = `../generated/${style}/${filename}`;
      writeCustom(original, definition.iconPath, accent);
    } else if (o.accent !== 'Teal' || o.accentIntensity !== 'vivid') {
      const suffix = o.accentIntensity === 'vivid' ? '' : '.' + o.accentIntensity;
      const original = definition.iconPath;
      const candidate = original.replace(/\.svg$/, `.accent.${accents[o.accent].slug}${suffix}.svg`);
      if (assetExists(candidate)) definition.iconPath = candidate;
      else {
        // A few upstream glyphs (for example gRPC) have no precolored variants.
        // Preserve their exact geometry and tint only the original mint color.
        const filename = `${path.basename(original, '.svg')}.${accent.slice(1).toLowerCase()}.svg`;
        definition.iconPath = `../generated/${style}/${filename}`;
        writeCustom(original, definition.iconPath, accent);
      }
    }
  }
  return result;
}

function writeChanged(file, value) {
  const bytes = typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n';
  if (fs.existsSync(file) && fs.readFileSync(file).equals(Buffer.from(bytes))) return false;
  fs.mkdirSync(path.dirname(file), {recursive: true});
  // Rename a complete file into place so VS Code never reads partially written JSON.
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, bytes);
  fs.renameSync(temporary, file);
  return true;
}

function renderAll(root, options = defaults) {
  const o = normalize(options);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const changed = [];
  for (const entry of manifest.contributes.themes) {
    const template = JSON.parse(fs.readFileSync(path.join(root, 'templates', path.basename(entry.path)), 'utf8'));
    if (writeChanged(path.join(root, entry.path), renderTheme(template, o))) changed.push(entry.path);
  }
  const customFiles = new Set();
  const writeCustom = (original, target, accent) => {
    if (customFiles.has(target)) return;
    customFiles.add(target);
    const from = path.resolve(root, 'build/themes', original);
    const to = path.resolve(root, 'build/themes', target);
    const svg = recolorSvg(fs.readFileSync(from, 'utf8'), accent);
    writeChanged(to, svg);
  };
  for (const entry of manifest.contributes.iconThemes) {
    const template = JSON.parse(fs.readFileSync(path.join(root, 'templates', path.basename(entry.path)), 'utf8'));
    const variant = entry.id.replace('vira-local-icons-', '');
    const exists = file => fs.existsSync(path.resolve(root, 'build/themes', file));
    if (writeChanged(path.join(root, entry.path), renderIcons(template, o, variant, writeCustom, exists))) changed.push(entry.path);
  }
  for (const entry of manifest.contributes.productIconThemes) {
    if (writeChanged(path.join(root, entry.path), fs.readFileSync(path.join(root, 'templates', path.basename(entry.path))))) changed.push(entry.path);
  }
  return {options: o, accent: accentColor(o), changed};
}

module.exports = {defaults, accents, capturedColors, normalize, accentColor, recolorSvg, renderTheme, renderIcons, renderAll};
