#!/usr/bin/env node

const commander = require('commander')
const path = require('path')

commander
  .option('-n, --notebooks <directory>', 'directory from which to serve notebooks (.js files)', './notebooks')
  .option('-v, --views <directory>', 'directory from which to serve notebook views (.json files)', './notebook-views')
  .option('-f, --force', 'force the creation of "./notebooks" and ".notebook-views" directories, if they don\'t exist', false)
  .option('-p, --port <n>', 'server port; defaults to 7897', 7897)
  .option('-w, --wsport <n>', 'websocket server port; defaults to 7898', 7898)
  .parse(process.argv);

process.env.PORT = commander.port
process.env.WS_PORT = commander.wsport
process.env.NOTEBOOKS_DIR = commander.notebooks
process.env.VIEWS_DIR = commander.views
process.env.FORCE = !!commander.force
require('../server')
