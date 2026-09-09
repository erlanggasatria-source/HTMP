// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import path from 'path';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/esm/index.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/cjs/index.js',
        format: 'cjs',
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
          ecma: 5, // For old browser support
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
          ecma: 5, // For old browser support
          comments: false
        }
      })
    ],
    watch: {
      include: 'src/**'
    }
  }
];