import Runner from './Runner'

async function start(notebookName, el, options={}) {
  const { liveUpdate, urlBase, messages } = options
  const runner = (new Runner({el, urlBase, messages })).notebookName(notebookName)
  if (liveUpdate) {
    try {
      await runner.connectWebSocket( (/^ws:\/\//).exec(liveUpdate) ? liveUpdate : null )
    } catch (e) { console.warn('Cannot connect WebSocket') }
  }
  await runner.syncNotebook()
  return runner
}

// Auto-runs
const regexResult = location.hash
  ? new RegExp('notebook=(?<file>[^&]*)').exec(location.hash)
  : new RegExp('\\/run\\/(?<file>[^.]*)(\\.js)?').exec(location.pathname.replace(/\/?$/, ''))
const notebookName = regexResult && regexResult.groups && regexResult.groups.file

// Autorun if there's a notebook name
if (notebookName) {
  let notebookEl = document.getElementById('notebook')
  if (!notebookEl) {
    notebookEl = document.createElement('div')
    notebookEl.setAttribute('id', 'notebook')
    document.body.insertBefore(notebookEl, document.querySelector('body script'))
  }

  let messagesEl = document.getElementById('messages')
  if (!messagesEl) {
    messagesEl = document.createElement('div')
    messagesEl.setAttribute('id', 'messages')
    document.body.insertBefore(messagesEl, document.querySelector('body script'))
  }

  start(
    notebookName,
    notebookEl,
    {
      liveUpdate: true,
      messages: messagesEl,
    }
  )
}


export default {
  start, Runner
}
