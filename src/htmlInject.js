const cheerio = require('cheerio')

function htmlInject(html, {head, body}) {
  if (typeof head === 'string') { head = [head] }
  if (typeof body === 'string') { body = [body] }
  const $ = cheerio.load(html)
  const $head = $('head')
  const $body = $('body')
  head.forEach(e => $head.append(`${e}\n`))
  body.forEach(e => $body.append(`${e}\n`))
  return $.html()
}

module.exports = htmlInject
