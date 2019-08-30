#!/usr/bin/env node

require = require('esm')(module)
const htmlInject = require('../src/htmlInject')
const resolveExternalImports = require('../src/resolveExternalImports').default

const commander = require('commander')
const path = require('path')
const mkdirp = require('mkdirp')
const fs = require('fs')
const objToAST = require('../src/objToAST')
const astring = require('astring')
const chalk = require('chalk')
const { rollup } = require('rollup')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const css = require('rollup-plugin-css-only')

commander
  .option('-n, --notebooks <directory>', 'directory from which to serve notebooks (.js files)', './notebooks')
  .option('-v, --views <directory>', 'directory from which to serve notebook views (.json files)', './notebook-views')
  .option('-p, --public <directory>', 'directory to serve as static -- in case your notebook might need to load files')
  .action(async function() {
    let notebookName = commander.args[0]
    if (!notebookName) {
      console.log(chalk.red.bold('Must specify notebook name'))
      process.exit(1)
    }
    notebookName = notebookName.replace(/\.js$/, '')

    // if the notebook is at the specified path (rather than in a notebooks directory
    // specified by --notebooks options), we assume the notebooks and views directories
    // are at the same path as the notebook
    if (fs.existsSync(path.resolve(notebookName + '.js'))) {
      commander.notebooks = commander.views = path.dirname(path.resolve(notebookName + '.js'))
    }

    try {
      const appDir = path.join(path.dirname(fs.realpathSync(__filename)), '..')

      const notebookPath = path.resolve(`${commander.notebooks}/${notebookName}.js`)
      console.log(chalk.blue(`Publishing notebook ${notebookPath}`))

      const notebook = require(notebookPath).default

      const tmpDir = path.resolve(`${appDir}/tmp/${notebookName}`)
      mkdirp.sync(tmpDir)

      const importPath = external => path.resolve(external.replace(/^\/notebooks/, commander.notebooks))
      await resolveExternalImports(notebook, null, null, null, importPath)
      const notebookCode = astring.generate(objToAST(notebook))
      fs.writeFileSync(`${tmpDir}/notebook.js`, `export default ${notebookCode};`, 'utf8')


      const playerCode = fs.readFileSync(`${appDir}/src/player.js`, 'utf8')
      fs.writeFileSync(`${tmpDir}/player.js`, playerCode, 'utf8')

      const playerCss = fs.readFileSync(`${appDir}/src/player.css`, 'utf8')
      fs.writeFileSync(`${tmpDir}/player.css`, playerCss, 'utf8')

      let htmlPath = path.resolve(`${commander.views}/${notebookName}.html`)
      if (!fs.existsSync(htmlPath)) {
        htmlPath = path.resolve(`${appDir}/src/index.html`)
      }
      console.log(chalk.blue(`Publishing view ${htmlPath}`))
      const playerHtml = fs.readFileSync(htmlPath, 'utf8')

      const outputDir = path.resolve(`./dist/${notebookName}`)
      const bundle = await rollup({
        input: `${tmpDir}/player.js`,
        plugins: [
          resolve(),
          commonjs(),
          css({
            output: `${outputDir}/index.css`,
            include: '/**/*.css'
          }),
        ],
      })
      await bundle.write({
        file: `${outputDir}/index.js`,
        name: "ObservableLocal",
        format: "umd",
        indent: false,
        extend: true,
      })

      fs.writeFileSync(
        `${outputDir}/index.html`,
        htmlInject(playerHtml, {
          head: `<link rel='stylesheet' href='index.css'>`,
          body: `<script type='text/javascript' src='index.js'></script>`,
        }),
        'utf8'
      )

      console.log(chalk.green(`Published to ${outputDir}`))
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        console.log(chalk.red.bold(`Could not find notebook module at '${e.message.match(/Cannot find module '([^']*)/)[1]}'`))
      } else {
        console.log('Error', e)
      }
    }
  })
  .parse(process.argv);

