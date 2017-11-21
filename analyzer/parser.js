const _ = require('ramda')
const { Either: { isRight, either: fold }, URL } = require('../dependencies')
const { maybe, noop, tryCatch } = require('../utils')

const normalized = _.curry((base, $) =>
  _.tap(result =>
    $('a').each(function () {
      tryCatch(() => new URL($(this).attr('href'), base))
      .map(_.tap(u => (u['hash'] = '', u['search'] = '')))
      .either(noop, sanitized => result.push(sanitized))
    }),
    []))

module.exports = pages =>
  pages.map(res =>
    maybe(res.options.uri)
    .chain(uri =>
      maybe(res.$)
      .bimap(
        () => console.log(`@parser: cannot parse document from "${uri}"`),
        $ => ({ uri, URLs: normalized(uri, $), html: $.html() }))))
  .filter(isRight)
  .map(fold(noop, _.identity))