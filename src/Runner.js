import resolveExternalImports from './resolveExternalImports'
import { Runtime, Library, Inspector } from '@observablehq/notebook-runtime'
import { select, local } from 'd3-selection'
import marked from 'marked'
import katex from '@observablehq/katex'
import highlightjs from '@observablehq/highlight.js'

const impl = local()
const viewstate = local()

export default class Runner {
  constructor(el) {
    this.el = el
    const stdlib = new Library
    const stdlibRequire = stdlib.require()
    this.runtime = new Runtime(new Library(async name => {
      if (name.indexOf('marked') === 0 ) { return marked }
      if (name.indexOf('@observablehq/katex') === 0 ) { return katex }
      if (name.indexOf('@observablehq/highlight.js') === 0 ) { return highlightjs }
      return stdlibRequire(name)
    }))
  }

  async connectWebSocket() {
    const ws = new WebSocket(await (await fetch('/socket')).text())
    ws.onmessage = message => {
      const { event, filename } = JSON.parse(message.data)
      if (event === 'update') {
        this.changedNotebook = filename
        this.syncNotebook()
      }
    }
    return this
  }

  async syncNotebook() {
    let notebook, states
    const notebookPath = `/notebooks/${this.notebookName}.js`
    try {
      notebook = ( await import(`${notebookPath}?${Date.now()}`) ).default
      await resolveExternalImports(notebook, select('#notebook').datum(), this.changedNotebook)
      states = await fetch(`/notebook-views/${this.notebookName}.json?${Date.now()}`)
      states = states.ok ? await states.json() : null
      this.update(notebook, states)
      document.querySelector('#messages').innerHTML = ''
    } catch (e) {
      console.log('Error Caught: ', e)
      document.querySelector('#messages').innerHTML = `
        <div style='padding: 40px'>
          <h1>Error</h1>
          <h3>Could not import notebook <a href=${notebookPath}>${notebookPath}</a>:</h3>
          <p style="color: #e7040f;">${e}</p>
        </div>
      `
    } finally {
      return this
    }
  }

  update(notebook, states) {
    let module = select(this.el).datum(notebook).selectAll('div.module')
      .data(notebook.modules, d => d.id)
    let self = this
    module.exit().remove()
    module.enter()
      .append('div').attr('class', 'module')
      .each(function(m) { impl.set(this, self.runtimeModule(m.id)) })
    .merge(module)
      .style('display', m => m.id === notebook.id ? null : 'none')
      .each(function (m, i) {
        const mImpl = impl.get(this)
        let variable = select(this).selectAll('div.variable')
          .data(d => d.variables, comparable)

        variable.enter()
          .append('div').attr('class', 'variable')
          .each(function (v, j) {
            const state = (states && states.modules[i] && states.modules[i].variables[j]) || {
              title: true,
              value: true,
              code: false,
            }
            viewstate.set(this, state)

            const sel = select(this)
            sel.append('pre').attr('class', 'title')
              .text(v.name ? v.name + ':' : null)
            const inspector = sel.append('div').attr('class', 'inspector')
            sel.append('pre').attr('class', 'code')
              .text(v.value ? formatCode(v.value) : null)
              .classed('javascript', true)
              .each(function() { highlightjs.highlightBlock(this) })

            const controls = sel.append('div').attr('class', 'controls')
            controls.append('div')
              .attr('class', 'show-title circle-button')
              .attr('title', 'Show/Hide Name')
              .on('click', () => {
                state.title = !state.title
                self.updateViewState(notebook)
              })
            controls.append('div')
              .attr('class', 'show-value circle-button')
              .on('click', () => {
                state.value = !state.value
                self.updateViewState(notebook)
              })
            controls.append('div')
              .attr('class', 'show-code circle-button')
              .attr('title', 'Show/Hide Code')
              .on('click', () => {
                state.code = !state.code
                self.updateViewState(notebook)
              })

            const vImpl = mImpl.variable(
              m.id === notebook.id ? new Inspector(inspector.node()) : null
            )

            if (v.from) {
              vImpl.import(v.remote, v.name, self.runtimeModule(v.from))
            } else {
              vImpl.define(v.name, v.inputs, v.value)
            }
            impl.set(this, vImpl)

            controls.append('div')
              .attr('class', 'rerun circle-button')
              .attr('title', 'Re-run cell')
              .on('click', function() {
                // re-run by redefining the variable
                if (v.from) {
                  vImpl.import(v.remote, v.name, self.runtimeModule(v.from))
                } else {
                  vImpl.define(v.name, v.inputs, v.value)
                }
              })
          })
        .merge(variable)
          .order()
          .each(function (v, j) {
            let state = viewstate.get(this)
            const hidden = !state.value
            const sel = select(this)
              .classed('hidden', hidden)

            sel.select('.title')
              .style('display', hidden || !state.title || !v.name ? 'none' : null)
            sel.select('.inspector')
              .style('display', hidden ? 'none' : null)
            sel.select('.code')
              .style('display', hidden || !state.code ? 'none' : null)

            sel.select('.show-title')
              .classed('off', !state.title)
              .style('display', hidden || !v.name ? 'none' : null)
            sel.select('.show-value')
              .attr('title', hidden && v.name ? `Show Cell "${v.name}"` : 'Show/Hide Cell')
              .classed('off', hidden)
            sel.select('.show-code')
              .classed('off', !state.code)
              .style('display', hidden || !v.value ? 'none' : null)
            sel.select('.rerun')
              .style('display', hidden ? 'none' : null)

          })

        variable.exit()
          .each(function (v) { impl.get(this).delete() })
          .remove()
      })
  }

  async updateViewState(notebook, states) {
    const state = { modules:[] }
    select('#notebook').selectAll('.module')
      .each(function(m) {
        if (m.id !== notebook.id) { return }
        const module = { id:m.id, variables:[] }
        state.modules.push(module)
        select(this).selectAll('.variable')
          .each(function(v) {
            module.variables.push(viewstate.get(this))
          })
      })
    this.update(notebook, states)
    await fetch(`/notebook-views/${this.notebookName}.json`, {
      method: 'POST',
      headers: { "Content-Type": "application/json; charset=utf-8", },
      body: JSON.stringify(state),
    })
  }

  runtimeModule(id) {
    const map = this.map || (this.map = new Map)
    let module = map.get(id);
    if (!module) map.set(id, module = this.runtime.module());
    return module;
  }

  notebook(_) {
    return arguments.length ? ((this.notebook = _), this) : this.notebook
  }
  notebookName(_) {
    return arguments.length ? ((this.notebookName = _), this) : this.notebookName
  }
}

function comparable(o) {
  return JSON.stringify(Object.keys(o).reduce((m, k) => {
    if (typeof o[k] === 'function') {
      m[k] = String(o[k])
    } else {
      m[k] = o[k]
    }
    return m
  }, {}))
}

function formatCode(value) {
  if (typeof value === 'function') {
    let lines = value.toString().split('\n')
    const lastIndent = lines[lines.length - 1]
      .match(/^\s*/)[0]
    lines = lines.map(l => l.replace(lastIndent, ''))
    return lines.join('\n')
  } else {
    return JSON.stringify(value)
  }
}
