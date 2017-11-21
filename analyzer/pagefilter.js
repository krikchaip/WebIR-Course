// TODO: [] optimize 'adsentIn' so that it calculates regex once

const _ = require('ramda')
const { Either: { either: fold }, Left, Right, Future, URL } = require('../dependencies')
const { maybe, tryCatch, noop } = require('../utils')

/* Depth: 4 functions */
const currentDir = URL =>
  maybe(URL.pathname)
  .map(_.split('/'))
  .map(_.when(_.pipe(_.last, _.isEmpty), _.dropLast(1)))
  .map(_.last)

/* Depth: 3 functions */
const absentIn = _.curry((xs, M) =>
  Right(xs)
  .map(_.join('|'))
  .map(s => new RegExp(s, 'i'))
  .chain(re => M.map(x => !_.test(re, x)))
  .either(_.F, _.identity))

const extension = URL =>
  currentDir(URL)
  .chain(cdir =>
    _.test(/\./, cdir)
      ? _.test(/^\w+(\.\w+)+$/, cdir)
        ? Right(_.pipe(_.split('.'), _.last)(cdir))
        : Left(cdir)
      : Right(''))

/* Depth: 2 functions */
const criteria = exclusions => _.allPass([
  _.propSatisfies(_.test(/^http(s)?:/), 'protocol'), // is http/https protocol?
  _.propSatisfies(_.test(/ku\.ac\.th$/), 'hostname'), // is KU domain?
  _.pipe(extension, absentIn(exclusions)), // isn't file shit?
])

/* Depth: 1 functions */
const $contentFilter = state =>
  _.compose(
    Future.of,
    _.map(({ uri, html }) =>
      tryCatch(() => new URL(uri))
      .chain(uri =>
        extension(uri)
        .chain(ext => {
          if(_.test(/htm|html/, ext)) {
            state.html++
            return Right({ dir: uri.hostname + uri.pathname, html })
          } else return Left(noop)
        }))
    ))

const urlFilter = exclusions =>
  _.compose(
    Future.of,
    _.map(({ uri, URLs }) =>
      ({ uri, URLs: _.filter(criteria(exclusions), URLs) })))

/* Root level */
module.exports = { url: urlFilter, $content: $contentFilter }