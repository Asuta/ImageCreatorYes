const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('referenceImages.js and app.js can load in the same page context', () => {
  const referenceScript = fs.readFileSync(
    path.join(__dirname, '../public/referenceImages.js'),
    'utf8',
  );
  const appScript = fs.readFileSync(
    path.join(__dirname, '../public/app.js'),
    'utf8',
  );

  const elementFactory = () => ({
    addEventListener() {},
    replaceChildren() {},
    querySelector() {
      return elementFactory();
    },
    cloneNode() {
      return elementFactory();
    },
    classList: {
      add() {},
      remove() {},
    },
    dataset: {},
    files: [],
    value: '',
    disabled: false,
    textContent: '',
    content: {
      cloneNode() {
        return elementFactory();
      },
    },
  });

  const context = vm.createContext({
    console,
    module: { exports: {} },
    exports: {},
    window: {},
    document: {
      getElementById() {
        return elementFactory();
      },
      createDocumentFragment() {
        return elementFactory();
      },
    },
    URL: {
      createObjectURL() {
        return 'blob:preview';
      },
      revokeObjectURL() {},
    },
    FileReader: function FileReader() {},
    FormData: function FormData() {},
    crypto: {
      randomUUID() {
        return 'uuid';
      },
    },
    fetch() {
      return Promise.resolve({
        ok: true,
        json: async () => ({ images: [] }),
      });
    },
  });

  assert.doesNotThrow(() => {
    vm.runInContext(referenceScript, context, { filename: 'referenceImages.js' });
    vm.runInContext(appScript, context, { filename: 'app.js' });
  });
});
