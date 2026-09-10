// rollup.config.js
const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');

module.exports = [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/esm/index.js',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      },
      {
        file: 'dist/cjs/index.js',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      }
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationDir: null,
        emitDeclarationOnly: false
      }),
      terser({
        output: {
          ecma: 5,
          comments: false
        }
      })
    ],
    watch: {
      include: 'src/**'
    }
  },
  {
    input: 'src/umd.ts',
    output: [
      {
        file: 'umd/htm-projection.js',
        format: 'umd',
        name: 'HTMP',
        exports: 'default',
        sourcemap: true,
        globals: {
          domparser: 'DOMParser'
        }
      }
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationDir: null,
        emitDeclarationOnly: false
      }),
      terser({
        output: {
          ecma: 5,
          comments: false
        }
      })
    ],
    watch: {
      include: 'src/**'
    }
  }
];