import Runner from './Runner'

async function start(notebookName, el) {
  const runner = (new Runner(el)).notebookName(notebookName)
  await runner.connectWebSocket()
  await runner.syncNotebook()
  return runner
}

export default {
  start, Runner
}
