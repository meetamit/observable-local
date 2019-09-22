#!/usr/bin/env node

const commander = require('commander')
const readline = require('readline')
const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const Diff = require('Diff')

commander
  .option('-o, --output <file>', 'filename into which the notebook will be saved')
  .option('-n, --notebooks <directory>', 'directory into which the notebook will be saved (-o overwrites this)', '.')
  .option('-f, --force', 'if there\'s an existing notebook, overwrite it' , false)
  .option('-d, --diff', 'if there\'s an existing notebook, output a diff of it' , false)
  .action(async function() {
    let notebookName = commander.args[0]
    if (!notebookName) {
      console.log(chalk.red.bold('Must specify notebook name'))
      process.exit(1)
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    try {
      // e.g. 7f6684ccf7803fb4 or @meetamit/hershey-fonts or https://observablehq.com/d/72a1e7941ee2c55e
      notebookName = notebookName
        .replace('https://observablehq.com/', '')
        .replace(/\.js$/, '')
      let [user, name] = notebookName.split('/')
      if (!name) {
        notebookName = user
        user = 'd'
      } else {
        notebookName = name
      }

      const notebookUrl = `https://api.observablehq.com/${user}/${notebookName}.js?v=1`
      console.log(chalk.blue(`Fetching ${chalk.bold(notebookUrl)}`))

      const code = await (await fetch(notebookUrl)).text()
      if (code.length < 20) {
        // probably response was `{"errors":[]}`
        throw new Error(`Notebook code is note valid: ${chalk.bold(code)}`)
      }
      const notebookFilePath = commander.output
        ? path.resolve(commander.output)
        : path.resolve(commander.notebooks, notebookName + '.js')

      const fileExists = fs.existsSync(notebookFilePath)
      let question = null,
          expectedAnswers = []
      if (commander.force) {
        // just write it
      } else if (!fileExists) {
        question = `This will create the file ${chalk.bold(notebookFilePath)}, ok?`
        expectedAnswers = [
          { key: 'y', means: 'Yes' },
          { key: 'n', means: 'No' },
        ]
      } else if (commander.diff) {
        // just diff it
      } else {
        //  Diff? Overwrite?
        question = `The file ${chalk.bold(notebookFilePath)} already exists.\nHow would you like to proceed?`
        expectedAnswers = [
          { key: 'd', means: 'Diff files' },
          { key: 'o', means: 'Overwrite existing' },
        ]
      }

      if (question) {
        question += `\n\n`
        question += chalk.blue(expectedAnswers.map(({key, means}) => `  ${key} = ${means}`).join('\n') + `\n\n`)
        question += `Enter a single character: `
        await new Promise((resolve, reject) => {
          rl.question(question, (answer) => {
            if (!expectedAnswers.map(a => a.key).includes(answer)) {
              return reject(`Invalid answer, "${answer}"`)
            } else if (answer === 'd') {
              commander.diff = true
            } else if (answer === 'o' || answer === 'y') {
              commander.force = true
            }
            resolve()
          })
        })

      }


      if (fileExists && commander.diff) {
        const diff = Diff.diffLines(fs.readFileSync(notebookFilePath, 'utf8'), code, { newlineIsToken: true, ignoreWhitespace:false })
        let message = ''
        if (diff.length === 1 && !diff[0].added && !diff[0].removed) {
          message += '\n' + chalk.green.bold(`The notebooks' contents are identical.`)
        } else {
          message += '\n\n---------------- Diff: ----------------\n'
          diff.forEach(function(part){
            const color = part.added ? 'green' : part.removed ? 'red' : 'grey'
            let value = part.value
            if (color === 'grey') {
              const lines = value.split('\n')
              if (lines.length >= 7) {
                value = lines.slice(0, 3).join('\n') + '\n⋮\n' + lines.slice(-3).join('\n')
              }
            } else if (color === 'red') {
              value += '\n'
            }
            message += chalk[color](value)
          });
        }
        console.log(message)
      }
      if (commander.force) {
        fs.writeFileSync(notebookFilePath, code, 'utf8')
        console.log(chalk.green(`Saved ${chalk.bold(code.length)} bytes to ${notebookFilePath}`))
      }
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        console.log(chalk.red.bold(`Could not find notebook module at '${e.message.match(/Cannot find module '([^']*)/)[1]}'`))
      } else {
        console.log(chalk.red(e))
      }
    } finally {
      rl.close();
    }
  })
  .parse(process.argv);

