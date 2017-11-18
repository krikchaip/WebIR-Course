const _ = require('ramda')
const { Either: { either: fold }, Left, Right, Future, URL } = require('../dependencies')
const { maybe, tryCatch, noop } = require('../utils')

/* Depth: 3 functions */
const currentDir = URL =>
  maybe(URL.pathname)
  .map(_.split('/'))
  .map(_.when(_.pipe(_.last, _.isEmpty), _.dropLast(1)))
  .map(_.last)

/* Depth: 2 functions */
const absentIn = arr =>
  _.pipe(_.map(x => !_.contains(x, arr)), fold(_.F, _.identity))

const extension = URL =>
  currentDir(URL)
  .chain(cdir =>
    _.test(/\./, cdir)
      ? _.test(/^\w+(\.\w+)+$/, cdir)
        ? Right(_.pipe(_.split('.'), _.last)(cdir))
        : Left(cdir)
      : Right(''))

/* Depth: 1 functions */
const contentFilter = _.compose(
  Future.of,
  _.map(({ right: { uri, html } }) =>
    tryCatch(() => new URL(uri))
    .chain(uri =>
      extension(uri)
      .chain(ext =>
        _.test(/htm|html/, ext)
          ? Right({ dir: uri.hostname + uri.pathname, html })
          : Left(noop))))) // Future e [Either noop { dir, html }]

// // test
// const pages = [
//   { right: { uri: 'http://www.kuappstore.ku.ac.th/index.html', html: `<div></div>` } }
// ]
// contentFilter(pages).value(console.log)

const urlFilter = exclusions =>
  _.compose(
    Future.of,
    _.map(({ left: URLs }) =>
      URLs.filter(
        _.allPass([
          _.propSatisfies(_.test(/^http(s)?:/), 'protocol'), // is http/https protocol?
          _.propSatisfies(_.test(/ku\.ac\.th$/), 'hostname'), // is KU domain?
          _.pipe(extension, absentIn(exclusions)), // isn't file shit?
        ])))) // Future e [[URL]]

// // test
// const pages = [
//   { left: [new URL('https://www.ku.ac.th/web2012'), new URL('https://ecourse.cpe.ku.ac.th/')] }
// ]
// urlFilter(exclusions)(pages).value(console.log)

/* Root level */
module.exports = { url: urlFilter, content: contentFilter }