// A lightweight player of a notebook. It gets bundled with the notebook itself, along
// with @observablehq/Runtime, Inspector.

import notebook from './notebook'
import { Runtime, Library, Inspector } from '@observablehq/runtime'
import '@observablehq/inspector/dist/inspector.css'
import './player.css'

function load (notebook, library, observer) {
  if (typeof library == "function") observer = library, library = null;
  if (typeof observer !== "function") throw new Error("invalid observer");
  if (library == null) library = new Library();

  const {modules, id} = notebook;
  const map = new Map;
  const runtime = new Runtime(library);
  const main = runtime_module(id);

  function runtime_module(id) {
    let module = map.get(id);
    if (!module) map.set(id, module = runtime.module());
    return module;
  }

  for (const m of modules) {
    const module = runtime_module(m.id);
    let i = 0;
    for (const v of m.variables) {
      if (v.from) {
        module
          .variable(module === main ? observer(v, i, m.variables) : void(0))
          .import(v.remote, v.name, runtime_module(v.from));
      } else if (module === main) module.variable(observer(v, i, m.variables)).define(v.name, v.inputs, v.value);
      else module.define(v.name, v.inputs, v.value);
      ++i;
    }
  }

  return runtime;
}

load(notebook, function({name}) {
  const el = document.body.querySelector(`[data-variable=${name}]`)
  return el ? new Inspector(el) : void(0)
})
