const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

// Execute the actual sheet and metadata code without loading native modules.
function loadTypeScript(relativePath, dependencies) {
  const filename = path.join(path.dirname(require.resolve('../package.json')), relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: filename,
  });
  const module = { exports: {} };
  runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      process: { env: {} },
      require(name) {
        assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`);
        return dependencies[name];
      },
    },
    { filename }
  );
  return module.exports;
}

const metadata = loadTypeScript('lib/tracker-metadata.ts', {
  '@/data/mock-lists': {},
});

function renderSheet(params) {
  const element = (type, props) => ({ type, props });
  const { default: ProgressSheet } = loadTypeScript('app/progress-sheet.tsx', {
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
    react: {
      useCallback: (callback) => callback,
      useMemo: (factory) => factory(),
      useState: (value) => [value, () => {}],
    },
    'expo-router': {
      Stack: { Screen: 'Screen' },
      router: {},
      useLocalSearchParams: () => ({ itemKey: 'anilist:1', ...params }),
    },
    'react-native': {
      View: 'View',
      Pressable: 'Pressable',
      TextInput: 'TextInput',
      TouchableWithoutFeedback: 'TouchableWithoutFeedback',
      Keyboard: {},
    },
    '@/components/themed-text': { ThemedText: 'ThemedText' },
    '@/components/ui/icon-symbol': { IconSymbol: 'IconSymbol' },
    '@/constants/theme': { Colors: { light: {} } },
    '@/contexts/lists-context': {
      useItemUserData: () => ({ itemUserData: {}, setItemUserData: () => {} }),
    },
    '@/hooks/use-color-scheme': { useColorScheme: () => 'light' },
    '@/lib/tracker-metadata': metadata,
  });
  return ProgressSheet();
}

function findHeading(node) {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === 'ThemedText' && node.props.style.fontWeight === '700') {
    return node.props.children;
  }
  for (const child of [node.props?.children].flat()) {
    const heading = findHeading(child);
    if (heading !== undefined) return heading;
  }
}

for (const [unit, expected] of [
  ['chapter', 'Chapters'],
  ['volume', 'Volumes'],
  ['item', 'Items'],
  ['episode', 'Episodes'],
  ['percent', 'Percent'],
]) {
  test(`missing label uses the long label for ${unit}`, () => {
    assert.equal(findHeading(renderSheet({ unit })), expected);
  });
}

test('explicit label takes precedence over the unit', () => {
  assert.equal(findHeading(renderSheet({ unit: 'chapter', label: 'Pages' })), 'Pages');
});

test('omitting both unit and label defaults to Episodes', () => {
  assert.equal(findHeading(renderSheet({})), 'Episodes');
});
