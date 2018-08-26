const http = require('http')
const path = require('path')
const connect = require('connect')
const serveStatic = require('serve-static')
const bodyParser = require('body-parser')
const WebSocket = require('ws')
const chokidar = require('chokidar')
const fs = require('fs')

const PORT = process.env.PORT || 7897
const WS_PORT = process.env.WS_PORT || 7898

const app = connect()

// route that serves an html that loads a notebook and opens a websocket to recieve change events
app.use('/run', (req, res) => {
  res.end(fs.readFileSync('./assets/index.html', 'utf8'))
})

// serve assets AND dist directories as static files
app.use('/assets', serveStatic('./assets', { fallthrough: true }))
app.use('/assets', serveStatic('./dist'))

// serve notebooks as static files
app.use('/notebooks', serveStatic('./notebooks'))

// serve views as static files and accept POST overwrites
app.use(bodyParser.json())
app.use('/notebook-views', function(req, res, next) {
  // console.log('commmmm', req.body, Object.keys(req.body))
  if (req.method === 'POST') {
    fs.writeFileSync(
      './notebook-views' + req.url,
      JSON.stringify(req.body, null, '  '),
      'utf8'
    )
    res.end('{}')
  } else {
    next()
  }
})
app.use('/notebook-views', serveStatic('./notebook-views'))



app.use('/socket', function(req, res, next) {
  res.end(`ws://${req.headers.host.split(':')[0]}:${WS_PORT}`)
})

const wss = new WebSocket.Server({ port: WS_PORT })
wss.on('connection', function connection(ws) {
  ws.on('error', function(e) {
    if (e.code !== 'ECONNRESET') {
      console.error(e)
    }
  })
})

// Broadcasts to all connected clients.
wss.broadcast = function(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

// Watch for file changes and broadcast them via websocket
var watcher = chokidar.watch('./notebooks').on('change', filepath => {
  const filename = path.basename(filepath)
  wss.broadcast(
    JSON.stringify({
      event: 'update',
      filename: filename.replace(path.extname(filename), '')
    })
  )
})

console.log(`Server listening on port ${PORT}`)
console.log(`Try visiting http://localhost:${PORT}/run/test-notebook`)
http.createServer(app).listen(PORT)

// caches the last seen version of a notebook so it can later be diff'ed with an updated version
const cache = new Map()

function requireUncached(module) {
  delete require.cache[require.resolve(module)]
  return require(module)
}
