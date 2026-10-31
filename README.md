# Solvey SVG Optimizer

Solvey SVG Optimizer makes SVG files smaller. Open, paste or drop an SVG, pick
the optimisations you want, compare the result with the original, and download
or copy the optimised markup. The optimisation itself is done by SVGO.

## Private by design

Everything runs in your browser. Your SVGs are never uploaded: optimisation,
gzip size comparison and syntax highlighting all happen locally in web workers.
There is no analytics, tracking or third-party code, and the app only loads its
own files. Once loaded, it also works offline.

## Development

You need Node.js 22.12 or later.

Install dependencies:

```sh
npm ci
```

Start a development server with live rebuilds at http://localhost:8080:

```sh
npm run dev
```

Lint the JavaScript and CSS:

```sh
npm run lint
```

## Building

Create a production build in `build/`:

```sh
npm run build
```

Serve the build locally at http://localhost:8080:

```sh
npm start
```

The contents of `build/` are static files and can be hosted on any web server.

## Third-party notices

`THIRD_PARTY_NOTICES.md` lists the third-party code and fonts shipped in the
app, with their licences. It is copied into `build/` and linked from the app
menu. After changing dependencies, regenerate it with:

```sh
npm run notices
```

## Licence

MIT, see LICENSE.md.
