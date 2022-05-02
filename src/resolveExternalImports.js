export default async function (notebook, urlBase, prevNotebook, changedNotebookName, importPath) {
  if (!importPath) {
    importPath = external => `${external.charAt(0) === '/' ? urlBase : ''}${external}?${Date.now()}`
  }
  let externals
  do {
    externals = await resolve(notebook, urlBase, prevNotebook, changedNotebookName, importPath)
  } while (externals && externals.size > 0)
  return externals
}

async function resolve (notebook, urlBase, prevNotebook, changedNotebookName, importPath) {
  const externals = new Set()
  notebook.modules.concat().forEach(m => {
    m.variables.concat(/*clone bc may mutate the original*/).forEach(v => {
      if (v.from && Array.isArray(v.remote)) {
        const j = m.variables.indexOf(v)
        m.variables.splice(j, 1) // remove the multi-import
        v.remote.forEach((_v, k) => {
          // add the import using normal syntax
          m.variables.splice(j + k, 0, {
            ...v,
            from:   v.from,
            name:   typeof _v === 'string' ? _v : _v.as,
            remote: typeof _v === 'string' ? _v : _v.name
          })
        })
      }
      if (v.remote && !v.name) { v.name = v.remote }
    })

    m.variables.forEach(v => {
      if (v.from && (v.from.charAt(0) === '/' || v.from.match(/^https?:\/\//))) {
        externals.add(v.from)
      }
    })
  })

  for (let external of externals) {
    if (notebook.modules.find(m => m.id === external)) {
      // external is actually embedded in notebook, so do nothing
      // console.log('actually have', external)
      externals.delete(external)
    } else if (prevNotebook && !external.match(new RegExp(`/${changedNotebookName}.js`)) && prevNotebook.modules.find(m => m.id === external)) {
      // external is available in the previous notebook and can be copied over
      // (we don't do this if we know that the imported notebook has changed)
      prevNotebook.modules.forEach(m => {
        if (m.id === external) {
          notebook.modules.push(m)
          // console.log('add old', m)
        }
      })
    } else {
      // external must be imported
      // console.log('importing', external)
      const remoteNotebook = (await import(importPath(external))).default
      // console.log('remoteNotebook',remoteNotebook)
      remoteNotebook.modules.forEach(m => {
        if (m.id === remoteNotebook.id) {
          // console.log("Look for importation of", external, 'in', notebook.modules.find(m => m.id === notebook.id))
          // const importation = notebook.modules.find(m => m.id === notebook.id).variables.find(v => v.from === external)
          notebook.modules.forEach(_m => {
            _m.variables.concat().forEach(v => {
              if (v.from === external && v.with) {
                if (v.with && !Array.isArray(v.with)) { v.with = [v.with] }
                v.with.forEach(w => {
                  const replaced = m.variables.find(v => v.name === (w.as || w))
                  const idx = m.variables.indexOf(replaced)
                  if (idx === -1) { console.warn('Could not find variable', w, 'in module:', m, '.') }
                  m.variables.splice(idx === -1 ? m.variables.length : idx, 1, {
                    from: _m.id,
                    remote: typeof w === 'string' ? w : w.name,
                    name: typeof w === 'string' ? w : w.as,
                  })
                })
              }
            })
          })
        } else {
          // any derivation (reciprocal imports) that refered to
          // the external -- now renamed -- module must be renamed too
          notebook.modules.forEach(_m => {
            _m.variables.concat().forEach(v => {
              if (v.from === remoteNotebook.id) {
                _m.variables.splice(_m.variables.indexOf(v), 1, {
                  ...v, from: external
                })
              }
            })
          })
        }
        notebook.modules.push({...m, external: external, id: m.id === remoteNotebook.id ? external : m.id})
        // console.log('add remote', m)
      })
    }
  }
  return externals
}
