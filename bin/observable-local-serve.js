#!/usr/bin/env node

const commander = require('commander')
const path = require('path')

commander
  .option('-n, --notebooks <directory>', 'directory from which to serve notebooks (.js files)', './notebooks')
  .option('-v, --views <directory>', 'directory from which to serve notebook views (.json files)', './notebook-views')
  .option('-f, --force', 'force the creation of "./notebooks" and ".notebook-views" directories, if they don\'t exist', false)
  .option('-p, --public <directory>', 'directory to serve as static -- in case your notebook might need to load files')
  .option('-h, --httport <n>', 'server http port; defaults to 7897', 7897)
  .option('-w, --wsport <n>', 'websocket port; defaults to 7898', 7898)
  .parse(process.argv);

process.env.PORT = commander.httport
process.env.WS_PORT = commander.wsport
process.env.NOTEBOOKS_DIR = commander.notebooks
process.env.VIEWS_DIR = commander.views
process.env.FORCE = !!commander.force
process.env.PUBLIC_DIR = commander.public || ''
require('../server')
