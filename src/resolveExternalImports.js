export default async function (notebook, prevNotebook, changedNotebookName) {
  // TODO: This process of gathering external urls and importing those modules should repeat
  // until no more external imports are found. Otherwise, if a remote module in turn imports
  // another remote module, the latter wouldn't be detected nor imported.
  const externals = new Set()
  notebook.modules.forEach(m => {
    m.variables.forEach((v,j) => {
      if (v.from && Array.isArray(v.remote)) {
        m.variables.splice(j, 1) // remove the multi-import
        v.remote.forEach((_v, k) => {
          // add the import using normal syntax
          m.variables.splice(j + k, 0, {
          // m.variables.push({
            from:   v.from,
            name:   typeof _v === 'string' ? _v : _v.as,
            remote: typeof _v === 'string' ? _v : _v.name
          })
        })
      }
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
      const remoteNotebook = (await import(`${external}?${Date.now()}`)).default
      // console.log('remoteNotebook',remoteNotebook)
      remoteNotebook.modules.forEach(m => {
        notebook.modules.push({...m, external: external, id: m.id === remoteNotebook.id ? external : m.id})
        // console.log('add remote', m)
      })
    }
  }
  return externals
}
