// TODO: [] no (, , ...) > 3 statements!!
// TODO: [] no CPS functions!!
// TODO: [] use Either monad instead of Maybe
// TODO: [] one big refactor
// TODO: [] write steps for each function above
// TODO: [] Hindley-Milner type system on every function
// FIXME: [] overwhelming memory usage(see log file for more information)
//           presumably 'Shared' or 'state.waiting'

const _ = require('ramda')
const { fold, Future, Crawler, Seenreq } = require('./dependencies')
const { beautifulLog } = require('./utils')

// Setup
const initState = { limit: 10, waiting: [] }
const visitedDb = new Seenreq()
const instance = new Crawler({
  timeout: 5000, // 5000
  maxConnections: 10, // 10
  retries: 0, // 3
  retryTimeout: 5000, // 10000
  jQuery: 'cheerio', // 'cheerio'
  forceUTF8: true // true
})

const scheduler = require('./scheduler')
const downloader = require('./downloader')(instance)
const analyzer = require('./analyzer')(visitedDb)
// const storage = require('./storage')

const crawler = seed =>
  scheduler(seed)
  .chain(downloader)
  .chain(analyzer)
  // .chain(crawler)

// Run
crawler(['https://ecourse.cpe.ku.ac.th/'])
  .eval(Future.of(initState))
  .value(beautifulLog)
  // .exec(Future.of(initState))
  // .value(beautifulLog)