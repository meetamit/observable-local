const http = require('http')
const path = require('path')
const connect = require('connect')
const serveStatic = require('serve-static')
const bodyParser = require('body-parser')
const WebSocket = require('ws')
const chokidar = require('chokidar')
const chalk = require('chalk')
const fs = require('fs')

const PORT = process.env.PORT || 7897
const WS_PORT = process.env.WS_PORT || 7898
const NOTEBOOKS_DIR = process.env.NOTEBOOKS_DIR || './notebooks'
const VIEWS_DIR = process.env.VIEWS_DIR || './notebook-views'


if (!fs.existsSync(NOTEBOOKS_DIR)) {
  console.error(
    chalk.bold.red(`
Directory "${NOTEBOOKS_DIR}" doesn't exist.
    `) + chalk.bold.blue(`
For more info, run \`observable-local --help\`
  `))
  process.exit(1)
}

const app = connect()

// route that serves an html that loads a notebook and opens a websocket to recieve change events
app.use('/run', (req, res) => {
  res.end(fs.readFileSync(appPath('./assets/index.html'), 'utf8'))
})

// serve assets AND dist directories as static files
app.use('/assets', serveStatic(appPath('./assets'), { fallthrough: true }))
app.use('/assets', serveStatic(appPath('./dist')))

// serve notebooks as static files
app.use('/notebooks', serveStatic(NOTEBOOKS_DIR))


if (!fs.existsSync(VIEWS_DIR)) {
  console.log(chalk.blue(`
  The directory "${VIEWS_DIR}" doesn't exist.
  Any view changes you make (e.g. turning on/off cells) will not persist.

  For more info, run \`observable-local --help\`
  `))
} else {
  // serve views as static files and accept POST overwrites
  app.use(bodyParser.json())
  app.use('/notebook-views', function(req, res, next) {
    if (req.method === 'POST') {
      console.log(chalk.blue(`Saving notebook view state "${VIEWS_DIR + req.url}"`))
      fs.writeFileSync(
        VIEWS_DIR + req.url,
        JSON.stringify(req.body, null, '  '),
        'utf8'
      )
      res.end('{}')
    } else {
      next()
    }
  })
  app.use('/notebook-views', serveStatic(VIEWS_DIR))
}


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
var watcher = chokidar.watch(NOTEBOOKS_DIR).on('change', filepath => {
  console.log(chalk.blue(`Change detected in "${filepath}"`))
  const filename = path.basename(filepath)
  wss.broadcast(
    JSON.stringify({
      event: 'update',
      filename: filename.replace(path.extname(filename), '')
    })
  )
})

let suggestedNotebook = 'welcome-notebook.js'
const existingNotebooks = fs.readdirSync(NOTEBOOKS_DIR)
if (existingNotebooks.length === 0) {
  fs.createReadStream(appPath(`./notebooks/${suggestedNotebook}`))
    .pipe(fs.createWriteStream(`./${NOTEBOOKS_DIR}/${suggestedNotebook}`))
} else if (existingNotebooks.indexOf(suggestedNotebook) == -1) {
  // pick a random notebook
  suggestedNotebook = existingNotebooks[Math.floor(Math.random() * existingNotebooks.length)]
}
const suggestedUrl = `http://localhost:${PORT}/run/${suggestedNotebook}`

console.log(`
  Server listening on port ${PORT}
  Try visiting ${chalk.bold.underline(suggestedUrl)}
`)
http.createServer(app).listen(PORT)

function appPath(relative) {
  return path.resolve(__dirname, relative)
}
