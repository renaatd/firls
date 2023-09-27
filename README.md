# firls

Browser application to design symmetric FIR filters using the least squares method.

This repository contains the Vue.js TypeScript code. The calculation is done by
the C++ library [fir-cpp](https://github.com/renaatd/fir-cpp). A
precompiled version is included in this repo (src/assets/fir.js).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
