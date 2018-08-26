export default async function (notebook, prevNotebook) {
  const externals = new Set()
  notebook.modules.forEach(m => {
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
    } else if (prevNotebook && prevNotebook.modules.find(m => m.id === external)) {
      // external is available in the previous notebook and can be copied over
      prevNotebook.modules.forEach(m => {
        if (m.id === external) {
          notebook.modules.push(m)
          // console.log('add old', m)
        }
      })
    } else {
      // external must be imported
      // console.log('importing', external)
      const remoteNotebook = (await import(external)).default
      // console.log('remoteNotebook',remoteNotebook)
      remoteNotebook.modules.forEach(m => {
        notebook.modules.push({...m, external: external, id: m.id === remoteNotebook.id ? external : m.id})
        // console.log('add remote', m)
      })
    }
  }
}
