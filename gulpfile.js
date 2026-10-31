import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { Transform } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { VERSION as SVGO_VERSION } from 'svgo';
import * as sass from 'sass';
import CleanCSS from 'clean-css';
import gulp from 'gulp';
import createGulpSass from 'gulp-sass';
import { nunjucksCompile } from 'gulp-nunjucks';
import { minify as minifyHtml } from 'html-minifier-terser';
import sirv from 'sirv';
import { rollup } from 'rollup';
import { nodeResolve as rollupResolve } from '@rollup/plugin-node-resolve';
import rollupCommon from '@rollup/plugin-commonjs';
import rollupReplace from '@rollup/plugin-replace';
import rollupTerser from '@rollup/plugin-terser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gulpSass = createGulpSass(sass);

const IS_DEV_TASK =
  process.argv.includes('dev') || process.argv.includes('--dev');

const buildConfig = {
  cleancss: {
    level: {
      1: {
        specialComments: 'all',
      },
      2: {
        all: false,
        mergeMedia: true,
        removeDuplicateMediaBlocks: true,
        removeEmpty: true,
      },
    },
    sourceMap: true,
    sourceMapInlineSources: true,
  },
  htmlmin: {
    collapseBooleanAttributes: true,
    collapseInlineTagWhitespace: false,
    collapseWhitespace: true,
    decodeEntities: true,
    minifyCSS: false,
    minifyJS: true,
    removeAttributeQuotes: true,
    removeComments: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    sortAttributes: true,
    sortClassName: true,
  },
  sass: {
    style: IS_DEV_TASK ? 'expanded' : 'compressed',
  },
  terser: {
    mangle: true,
    compress: {
      passes: 2,
    },
    format: {
      // Keep licence comments (/*!, @license, @preserve)
      comments: 'some',
    },
  },
};

const readJSON = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
};

// Pipe each file's contents through `fn`, which may be async
const mapContents = (fn) =>
  new Transform({
    objectMode: true,
    async transform(file, encoding, callback) {
      try {
        const result = await fn(file.contents.toString());
        file.contents = Buffer.from(result);
        callback(null, file);
      } catch (error) {
        callback(error);
      }
    },
  });

const passThrough = () =>
  new Transform({
    objectMode: true,
    transform(file, encoding, callback) {
      callback(null, file);
    },
  });

const minifyCss = () =>
  mapContents(
    (content) => new CleanCSS(buildConfig.cleancss).minify(content).styles,
  );

function copy() {
  return gulp
    .src(
      [
        'src/{imgs,test-svgs,fonts}/**',
        // Exclude the test-svgs files except for `car-lite.svg`
        // which is used in the demo
        '!src/test-svgs/!(car-lite.svg)',
        '!src/imgs/maskable.svg',
        'src/*.json',
      ],
      // Fonts and images are binary
      { encoding: false },
    )
    .pipe(gulp.dest('build'));
}

// Self-hosted fonts (latin subsets only) and the licence notices
function copyVendor() {
  return gulp
    .src(
      [
        'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
        'node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
        'THIRD_PARTY_NOTICES.md',
      ],
      { encoding: false },
    )
    .pipe(
      gulp.dest((file) =>
        file.extname === '.woff2' ? 'build/fonts' : 'build',
      ),
    );
}

function css() {
  return gulp
    .src('src/css/*.scss', { sourcemaps: true })
    .pipe(gulpSass.sync(buildConfig.sass).on('error', gulpSass.logError))
    .pipe(IS_DEV_TASK ? passThrough() : minifyCss())
    .pipe(gulp.dest('build/', { sourcemaps: '.' }));
}

async function html() {
  const [config, changelog, headCSS] = await Promise.all([
    readJSON(path.join(__dirname, 'src', 'config.json')),
    readJSON(path.join(__dirname, 'src', 'changelog.json')),
    fs.readFile(path.join(__dirname, 'build', 'head.css'), 'utf8'),
  ]);

  return gulp
    .src('src/*.html')
    .pipe(
      nunjucksCompile({
        plugins: config.plugins,
        headCSS,
        APP_VERSION: changelog[0].version,
        SVGO_VERSION,
        title: 'Solvey SVG Optimizer',
        description:
          'Easy & visual compression of SVG images, right in your browser.',
        iconPath: 'imgs/icon.png',
      }),
    )
    .pipe(
      IS_DEV_TASK
        ? passThrough()
        : mapContents((content) => minifyHtml(content, buildConfig.htmlmin)),
    )
    .pipe(gulp.dest('build'));
}

// Terser can drop licence comments attached to code it rewrites, so copy
// them from bundled dependencies into a /*! banner, which it always keeps.
const licenseBanner = () => ({
  name: 'license-banner',
  banner(chunk) {
    const comments = new Set();

    for (const id of chunk.moduleIds) {
      if (!id.includes('node_modules')) continue;
      const { code } = this.getModuleInfo(id);
      for (const [comment] of code.matchAll(/\/\*[\s\S]*?\*\//g)) {
        if (/@license|@preserve|^\/\*!/.test(comment)) {
          comments.add(comment.replace(/^\/\*+!?/, '/*!'));
        }
      }
    }

    return [...comments].join('\n');
  },
});

const rollupCaches = new Map();

async function js(entry, outputPath) {
  const name = path.basename(path.dirname(entry));
  const changelog = await readJSON(
    path.join(__dirname, 'src', 'changelog.json'),
  );
  const bundle = await rollup({
    cache: rollupCaches.get(entry),
    input: `src/${entry}`,
    plugins: [
      rollupReplace({
        preventAssignment: true,
        APP_VERSION: JSON.stringify(changelog[0].version),
      }),
      rollupResolve({ browser: true }),
      rollupCommon({ include: /node_modules/ }),
      licenseBanner(),
      // Don't use terser on development
      IS_DEV_TASK
        ? ''
        : rollupTerser(
            name === 'page'
              ? {
                  ...buildConfig.terser,
                  mangle: {
                    properties: {
                      regex: /^_/,
                    },
                  },
                }
              : buildConfig.terser,
          ),
    ],
  });

  rollupCaches.set(entry, bundle.cache);

  await bundle.write({
    sourcemap: true,
    format: 'iife',
    file: `build/${outputPath}/${name}.js`,
  });
}

function clean() {
  return fs.rm('build', { force: true, recursive: true });
}

const allJs = gulp.parallel(
  js.bind(null, 'js/prism-worker/index.js', 'js/'),
  js.bind(null, 'js/gzip-worker/index.js', 'js/'),
  js.bind(null, 'js/svgo-worker/index.js', 'js/'),
  js.bind(null, 'js/sw/index.js', ''),
  js.bind(null, 'js/page/index.js', 'js/'),
);

const mainBuild = gulp.parallel(
  gulp.series(css, html),
  allJs,
  copy,
  copyVendor,
);

function watch() {
  gulp.watch(['src/css/**/*.scss'], gulp.series(css, html));
  gulp.watch(['src/js/**/*.js'], allJs);
  gulp.watch(
    ['src/**/*.{html,svg,woff2}', 'src/*.json', 'THIRD_PARTY_NOTICES.md'],
    gulp.parallel(html, copy, copyVendor, allJs),
  );
}

function serve() {
  const port = 8080;
  http
    .createServer(sirv('build', { dev: true }))
    .listen(port, 'localhost', () => {
      console.log(`Serving build/ at http://localhost:${port}`);
    });
}

export { clean, allJs, css, html, copy, copyVendor, mainBuild as build };

export const cleanBuild = gulp.series(clean, mainBuild);

export const dev = gulp.series(clean, mainBuild, gulp.parallel(watch, serve));
