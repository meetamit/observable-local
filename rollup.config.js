import * as meta from "./package.json";
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import {terser} from 'rollup-plugin-terser';

const config = {
  input: "src/index.js",
  output: {
    file: `dist/${meta.name}.js`,
    name: "ObservableLocal",
    format: "umd",
    indent: false,
    extend: true,
  },
  plugins: [resolve(), commonjs()]
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
