'use strict';
const path = require('node:path');
const {renderAll} = require('../src/theme-engine.cjs');
const result = renderAll(path.resolve(__dirname, '..'));
console.log(`Generated ${result.changed.length} files; default accent ${result.accent}.`);
