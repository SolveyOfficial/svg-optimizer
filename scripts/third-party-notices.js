// Writes THIRD_PARTY_NOTICES.md for the third-party code and fonts that are
// shipped in build/. Run with `npm run notices` after changing dependencies.
//
// svgo ships a prebuilt browser bundle (svgo/dist/svgo.browser.js), so the
// packages it contains are listed by hand. They are the runtime dependencies
// reached from svgo/lib/svgo.js.
/* eslint-disable no-await-in-loop -- packages are read one at a time, in order */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = path.join(root, 'node_modules');

const packages = [
  { name: 'svgo', usedFor: 'SVG optimisation (svgo-worker.js)' },
  { name: 'boolbase', usedFor: 'bundled inside svgo' },
  { name: 'css-select', usedFor: 'bundled inside svgo' },
  { name: 'css-tree', usedFor: 'bundled inside svgo' },
  {
    name: 'css-tree',
    dir: 'csso/node_modules/css-tree',
    usedFor: 'bundled inside svgo (via csso)',
  },
  { name: 'css-what', usedFor: 'bundled inside svgo' },
  { name: 'csso', usedFor: 'bundled inside svgo' },
  { name: 'dom-serializer', usedFor: 'bundled inside svgo' },
  { name: 'domelementtype', usedFor: 'bundled inside svgo' },
  { name: 'domhandler', usedFor: 'bundled inside svgo' },
  { name: 'domutils', usedFor: 'bundled inside svgo' },
  { name: 'entities', usedFor: 'bundled inside svgo' },
  { name: 'mdn-data', usedFor: 'CSS data bundled inside svgo (via css-tree)' },
  { name: 'nth-check', usedFor: 'bundled inside svgo' },
  { name: 'sax', usedFor: 'bundled inside svgo' },
  { name: 'source-map-js', usedFor: 'bundled inside svgo (via css-tree)' },
  { name: 'pako', usedFor: 'gzip size comparison (gzip-worker.js)' },
  { name: 'nanoevents', usedFor: 'UI events (page.js)' },
  { name: 'prismjs', usedFor: 'markup highlighting (prism-worker.js)' },
  {
    name: '@rollup/plugin-commonjs',
    usedFor: 'small module helper code in prism-worker.js',
  },
];

// boolbase publishes no licence file, so its ISC licence is written out here.
const boolbaseLicense = `ISC License

Copyright (c) Felix Boehm <me@feedic.com>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

// pako's licence file only covers its MIT part. The zlib port it bundles is
// under the zlib licence, whose notice is kept in the sources in its source map.
const pakoZlibNotice = async () => {
  const map = JSON.parse(
    await fs.readFile(
      path.join(modules, 'pako/dist/browser/pako_deflate.esm.min.mjs.map'),
      'utf8',
    ),
  );
  const source = map.sourcesContent.find((content) =>
    content?.includes('Jean-loup Gailly and Mark Adler'),
  );
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.includes('(C) 1995'));
  const end = lines.findIndex((line) => line.includes('This notice may not'));
  return lines
    .slice(start, end + 1)
    .map((line) => line.replace(/^\/\/ ?/, ''))
    .join('\n');
};

const readLicense = async (dir) => {
  const files = await fs.readdir(dir);
  const file = files.find((name) => /^licen[cs]e/i.test(name));
  if (!file) return undefined;
  const text = await fs.readFile(path.join(dir, file), 'utf8');
  return text.trim();
};

const repoUrl = (pkg) => {
  const repo =
    typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  if (!repo) return pkg.homepage;
  const url = repo
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@github\.com\//, 'https://github.com/')
    .replace(/^github:/, '')
    .replace(/\.git$/, '');
  // Shorthand "owner/repo" means GitHub
  return /^https?:/.test(url) ? url : `https://github.com/${url}`;
};

const section = ({ title, version, license, source, usedFor, text }) =>
  [
    `## ${title}${version ? ` ${version}` : ''}`,
    '',
    `- Licence: ${license}`,
    `- Source: ${source}`,
    `- Used for: ${usedFor}`,
    '',
    '```text',
    text,
    '```',
    '',
  ].join('\n');

const sections = [];

for (const { name, dir = name, usedFor } of packages) {
  const pkgDir = path.join(modules, dir);

  const pkg = JSON.parse(
    await fs.readFile(path.join(pkgDir, 'package.json'), 'utf8'),
  );
  let text = await readLicense(pkgDir);
  if (name === 'boolbase') text ??= boolbaseLicense;
  if (!text) throw new Error(`No licence text found for ${name}`);
  if (name === 'pako') {
    text += `\n\nzlib licence, for the zlib port:\n\n${await pakoZlibNotice()}`;
  }

  sections.push(
    section({
      title: pkg.name,
      version: pkg.version,
      license: pkg.license,
      source: repoUrl(pkg),
      usedFor,
      text,
    }),
  );
}

const fontLicense = await readLicense(
  path.join(modules, '@fontsource-variable/inter'),
);
// The OFL text after the first paragraph, which holds Inter's copyright line
const oflText = fontLicense.slice(fontLicense.indexOf('\n\n'));

for (const font of [
  {
    title: 'Inter',
    dir: '@fontsource-variable/inter',
    source: 'https://github.com/rsms/inter',
    usedFor: 'body text (fonts/inter-latin-wght-normal.woff2)',
  },
  {
    title: 'Plus Jakarta Sans',
    dir: '@fontsource-variable/plus-jakarta-sans',
    source: 'https://github.com/tokotype/PlusJakartaSans',
    usedFor: 'headings (fonts/plus-jakarta-sans-latin-wght-normal.woff2)',
  },
]) {
  const pkgDir = path.join(modules, font.dir);

  const pkg = JSON.parse(
    await fs.readFile(path.join(pkgDir, 'package.json'), 'utf8'),
  );
  sections.push(
    section({
      title: `${font.title} font`,
      version: `(${pkg.name} ${pkg.version})`,
      license: pkg.license,
      source: font.source,
      usedFor: font.usedFor,
      text: await readLicense(pkgDir),
    }),
  );
}

// Inconsolata ships as woff2 files in src/fonts; the copyright line is taken
// from the fonts' own name table.
sections.push(
  section({
    title: 'Inconsolata font',
    version: '3.001',
    license: 'OFL-1.1',
    source: 'https://github.com/googlefonts/Inconsolata',
    usedFor: 'code view (fonts/code-*.woff2)',
    text: `Copyright 2006 The Inconsolata Project Authors (https://github.com/cyrealtype/Inconsolata)${
      oflText
    }`,
  }),
  // The demo image's licence is recorded in its own metadata.
  section({
    title: 'little red racing car (demo image)',
    license: 'Public domain',
    source: 'Onsemeliot, 2013 (dc:creator in the file)',
    usedFor: 'Demo button (test-svgs/car-lite.svg)',
    text: 'Dedicated to the public domain:\nhttp://creativecommons.org/licenses/publicdomain/',
  }),
);

const output = [
  '# Third-party notices',
  '',
  'Solvey SVG Optimizer includes the following third-party software and fonts.',
  'Each is listed with its full licence text.',
  '',
  sections.join('\n'),
].join('\n');

await fs.writeFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), output);
