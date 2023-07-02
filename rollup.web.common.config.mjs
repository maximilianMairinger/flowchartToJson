import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonJS from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import babel from '@rollup/plugin-babel';


export default {
  input: 'code.ts',
  output: {
    file: 'code.js',
    format: 'cjs',
    // sourcemap: true
  },
  // sourcemap: true,
  plugins: [
    typescript({tsconfig: "./tsconfig.json", noEmitOnError: false}), 
    resolve({browser: true}),
    commonJS({
      include: 'node_modules/**',
      
    }),
    
    
    json(),
    babel({
      babelHelpers: 'bundled',
      include: 'node_modules/**',
      
      presets: [
        [
          "@babel/preset-env",
          {
            "targets": {
              "esmodules": true
            }
          }
        ]
      ],
      plugins: ["@babel/plugin-proposal-nullish-coalescing-operator"]
      
    }),
  ]
};
