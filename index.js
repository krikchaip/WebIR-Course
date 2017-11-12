const _ = require('ramda')
const { Reader, IO, Maybe, Either } = require('ramda-fantasy')
const { Nothing, Just, toMaybe: fromNullable } = Maybe

const Crawler = require('crawler')
const Seenreq = require('seenreq')
const FsPath = require('fs-path')
const { URL } = require('url')

// =================================================================================================

// Scheduler

// Downloader
const onsuccess = _.curry((cb, res) =>
  fromNullable(res.statusCode)
  .map(_.test(/^2\d\d$/))
  .chain(s => s ? Just(() => cb(res)) : Nothing())
  .getOrElse(() => console.error(`status code failure`))())

const addCb = _.curry((fn, opt) =>
  opt.callback = (err, res, done) =>
    (err ? console.error(err)
         : onsuccess(fn, res)
    , done()))

const listen = _.curry((ev, fn, inst) => IO(() => inst.on(ev, fn)))

const downloader = URLs =>
  Reader(({ instance, next }) =>
    listen('schedule', addCb(next), instance)
    .chain(() => IO(() => instance.queue(URLs)))
    .runIO())

// Analyzer
const analyzer = res =>
  parser(res)

// Storage

// =================================================================================================

const instance = new Crawler({
  timeout: 5000, // 5000
  maxConnections: 10, // 10
  retries: 3, // 3
  jQuery: 'cheerio', // 'cheerio'
  forceUTF8: true // true
})

downloader(['https://ecourse.cpe.ku.ac.th'])
  .run({ instance, next: analyzer })