import * as meta from "./package.json";
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import {terser} from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only'

const config = {
  input: "src/index.js",
  output: {
    file: `dist/${meta.name}.js`,
    name: "ObservableLocal",
    format: "umd",
    indent: false,
    extend: true,
  },
  plugins: [
    resolve(),
    commonjs(),
    css({ output: 'dist/bundle.css' }),
  ]
};

export default [
  config,
  {
    ...config,
    output: {
      ...config.output,
      file: `dist/${meta.name}.min.js`
    },
    plugins: [
      ...config.plugins,
      terser()
    ]
  }
];
