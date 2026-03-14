/* global __dirname */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const patches = [
  {
    file: path.join(
      root,
      'node_modules',
      'react-native-screens',
      'src',
      'components',
      'helpers',
      'prepareHeaderBarButtonItems.ts'
    ),
    replacements: [
      {
        from: "  side: 'left' | 'right',\n): HeaderBarButtonItemWithMenu['menu'] => {",
        to: "  side: 'left' | 'right',\n  path: string[] = [],\n): HeaderBarButtonItemWithMenu['menu'] => {",
      },
      {
        from: '          ...prepareMenu(menuItem, menuIndex, side),',
        to: "          ...prepareMenu(menuItem, index, side, [...path, String(menuIndex)]),",
      },
      {
        from: '        menuId: `${menuIndex}-${index}-${side}`,',
        to: "        menuId: `${[...path, String(menuIndex)].join('.')}-${index}-${side}`,",
      },
    ],
  },
  {
    file: path.join(
      root,
      'node_modules',
      'react-native-screens',
      'lib',
      'commonjs',
      'components',
      'helpers',
      'prepareHeaderBarButtonItems.js'
    ),
    replacements: [
      {
        from: 'const prepareMenu = (menu, index, side) => {',
        to: 'const prepareMenu = (menu, index, side, path = []) => {',
      },
      {
        from: '          ...prepareMenu(menuItem, menuIndex, side)',
        to: "          ...prepareMenu(menuItem, index, side, [...path, String(menuIndex)])",
      },
      {
        from: '        menuId: `${menuIndex}-${index}-${side}`',
        to: "        menuId: `${[...path, String(menuIndex)].join('.')}-${index}-${side}`",
      },
    ],
  },
  {
    file: path.join(
      root,
      'node_modules',
      'react-native-screens',
      'lib',
      'module',
      'components',
      'helpers',
      'prepareHeaderBarButtonItems.js'
    ),
    replacements: [
      {
        from: 'const prepareMenu = (menu, index, side) => {',
        to: 'const prepareMenu = (menu, index, side, path = []) => {',
      },
      {
        from: '          ...prepareMenu(menuItem, menuIndex, side)',
        to: "          ...prepareMenu(menuItem, index, side, [...path, String(menuIndex)])",
      },
      {
        from: '        menuId: `${menuIndex}-${index}-${side}`',
        to: "        menuId: `${[...path, String(menuIndex)].join('.')}-${index}-${side}`",
      },
    ],
  },
];

let updated = 0;

for (const patch of patches) {
  if (!fs.existsSync(patch.file)) {
    continue;
  }

  let content = fs.readFileSync(patch.file, 'utf8');
  let changed = false;

  for (const replacement of patch.replacements) {
    if (content.includes(replacement.to)) {
      continue;
    }

    if (!content.includes(replacement.from)) {
      throw new Error(`Expected snippet not found in ${patch.file}`);
    }

    content = content.replace(replacement.from, replacement.to);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(patch.file, content, 'utf8');
    updated += 1;
  }
}

if (updated > 0) {
  console.log(`Patched react-native-screens nested header menu IDs in ${updated} file(s).`);
}
