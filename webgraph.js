/* source: https://gist.github.com/kristopherjohnson/5065599 */
// let { stdin, stdout } = process,
//     inputChunks = []

// stdin.setEncoding('utf8')
// stdin.on('data', chunk => inputChunks.push(chunk))
// stdin.on('end', () => stdout.write(inputChunks.join('')))

const _ = require('ramda')
const { Either } = require('ramda-fantasy')
const Future = require('fluture')
const cheerio = require('cheerio')
const fs = require('fs')
const { URL } = require('url')

const fromNullable = _.ifElse(_.isNil, Either.Left, Either.Right)

const tryCatch =
  _.tryCatch(f => Either.Right(f())
            ,e => Either.Left(e))

const readHTMLfile = path =>
  Future.encaseN2(fs.readFile)(path, 'utf8')

const readStdinSync =
  Future.node(done => {
    const inputChunks = []
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => inputChunks.push(chunk))
    process.stdin.on('end', () => done(null, inputChunks.join('')))
  })

const urlmap = str =>
  tryCatch(() => JSON.parse(str))
  .bimap(() => [], _.identity)
  .chain(makeSureIsArray)
  .chain(_.traverse(Either.of, havePathAndUrl))
  .either(Future.reject, Future.of)

const makeSureIsArray = obj =>
  Array.isArray(obj)
    ? Either.Right(obj)
    : Either.Left(`input isn't an array, end computation.`)

const havePathAndUrl = obj =>
  obj.path && obj.url
    ? Either.Right(obj)
    : Either.Left(`no 'path' and 'url' keys found, end computation.`)

const path2Edges =
  _.traverse(Future.of
            ,({ url, path }) =>
              readHTMLfile(path)
              .map(cheerio.load)
              .map($ => findEdges(url, $)))

const findEdges = (url, $, result = []) => (
  $('a').each(function () {
    fromNullable($(this).attr('href'))
    .chain(href => tryCatch(() => new URL(href, url)))
    .either(() => {}, r => result.push(r.href))
  }),
  { url, edges: _.uniq(result) }
)

readStdinSync
.chain(urlmap)
.map(_.take(10))
.chain(path2Edges)
.fork(console.error, console.log)