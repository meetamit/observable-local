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

export default {
  start, Runner
}
