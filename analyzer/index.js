// TODO: [] remove 'Storage' sub-module and replacing with Future computation
// TODO: [] log each loaded page(do it like you did on scheduler)
// TODO: [] excludes other filename extensions than HTML

const _ = require('ramda')
const { Identity, State, URL } = require('../dependencies')
const { maybe, tryCatch, noop, branchResult } = require('../utils')

const normalized = _.curry((base, $) =>
  Identity([])
  .map(_.tap(result =>
    $('a').each(function () {
      tryCatch(() => new URL($(this).attr('href'), base))
      .map(_.tap(u => (u['hash'] = '', u['search'] = '')))
      .either(noop, sanitized => result.push(sanitized))
    })))
  .get())

/* Depth : 1 functions */
// const eliminator =
// const contentFilter =
// const urlFilter =
const parser = _.lift(_.map(page =>
  maybe(page.options.uri)
  .chain(uri =>
    maybe(page.$)
    .map($ =>
      branchResult(normalized(uri, $), { html: $.html(), uri })))))

module.exports = _.curry((db, pagesM) =>
  State.of(pagesM) // Future e [res]
  .map(parser)) // Future e (Either null (Branch [URL] { html, uri }))