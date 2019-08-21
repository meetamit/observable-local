const http = require('http')
const path = require('path')
const connect = require('connect')
const serveStatic = require('serve-static')
const bodyParser = require('body-parser')
const compression = require('compression')
const WebSocket = require('ws')
const chokidar = require('chokidar')
const chalk = require('chalk')
const mkdirp = require('mkdirp')
const fs = require('fs')

const PORT = process.env.PORT || 7897
const WS_PORT = process.env.WS_PORT || 7898
const NOTEBOOKS_DIR = process.env.NOTEBOOKS_DIR || './notebooks'
const VIEWS_DIR = process.env.VIEWS_DIR || './notebook-views'
const PUBLIC_DIR = process.env.PUBLIC_DIR || null
const FORCE = process.env.FORCE === 'true' || process.env.FORCE === true ? true : false

if (FORCE) {
  console.log(chalk.blue(`Creating directory "${path.resolve(NOTEBOOKS_DIR)}"`))
  console.log(chalk.blue(`Creating directory "${path.resolve(VIEWS_DIR)}"`))
  mkdirp.sync(NOTEBOOKS_DIR)
  mkdirp.sync(VIEWS_DIR)
}

if (!fs.existsSync(NOTEBOOKS_DIR)) {
  console.error(
    chalk.bold.red(`
Directory "${path.resolve(NOTEBOOKS_DIR)}" doesn't exist.
    `) + chalk.bold.blue(`
Run with -f (--force) to have the directories created for you. For more info, run \`observable-local --help\`
  `))
  process.exit(1)
}

const app = connect()
app.use(compression())

// serve dist directory as static files
app.use('/run', serveStatic(appPath('./dist'  ), { fallthrough: true }))

// route that serves an html that loads a notebook and opens a websocket to recieve change events
app.use('/run', (req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.end(fs.readFileSync(appPath('./dist/index.html'), 'utf8'))
})

// serve notebooks directory listing as json
app.use('/notebooks', function(req, res, next) {
  if (req.url === '/') {
    res.setHeader('Content-Type', 'application/json')
    fs.readdir(NOTEBOOKS_DIR, (err, listing) => {
      if (err) {
        console.log(chalk.red(err))
      } else {
        res.end(JSON.stringify(listing))
      }
    })
  } else {
    next()
  }
})
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

if (PUBLIC_DIR && fs.existsSync(PUBLIC_DIR)) {
  // serve static files from a user-specified public directory
  console.log(chalk.blue(`Serving "${path.resolve(PUBLIC_DIR)}" as static directory`))
  app.use('/', serveStatic(PUBLIC_DIR))
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
var watcher = chokidar.watch(NOTEBOOKS_DIR).on('change', (filepath, meta) => {
  const accessTime = meta && meta.atime && meta.atime.getTime()
  const modifyTime = meta && meta.mtime && meta.mtime.getTime()
  // In certain cases (specifically on Windows and possibly only when
  // files are on a network drive), Chokidar triggers events even if the
  // file was simply accessed (as opposed to modified), which in-turn
  // can create infinite update loops. To avoid this, we compare timestamps
  // and only proceed if modifiedTime is as recent as accessTime
  if (accessTime > modifyTime) { return }

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
  fs.createReadStream(appPath(`./notebook-views/${suggestedNotebook}on`))
    .pipe(fs.createWriteStream(`./${VIEWS_DIR}/${suggestedNotebook}on`))
} else if (existingNotebooks.indexOf(suggestedNotebook) == -1) {
  // pick a random notebook
  suggestedNotebook = existingNotebooks[Math.floor(Math.random() * existingNotebooks.length)]
}
const suggestedUrl = `http://localhost:${PORT}/run/${suggestedNotebook.replace(/.js$/, '')}`

console.log(`
  Server listening on port ${PORT}
  Try visiting ${chalk.bold.underline(suggestedUrl)}
`)
http.createServer(app).listen(PORT)

function appPath(relative) {
  return path.resolve(__dirname, relative)
}
