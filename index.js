// TODO: [] no (, , ...) > 3 statements!!
// TODO: [] no CPS functions!!
// TODO: [] use Either monad instead of Maybe
// TODO: [] one big refactor
// TODO: [] write steps for each function above
// TODO: [] Hindley-Milner type system on every function
// FIXME: [] overwhelming memory usage(see log file for more information)
//           presumably 'Shared' or 'state.waiting'

const _ = require('ramda')
const { Either: { either: fold }, Future, Crawler, Seenreq } = require('./dependencies')
const { beautifulLog, noop } = require('./utils')

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

// chainRec
const crawler = seed =>
  scheduler(seed)
  .chain(downloader)
  .chain(analyzer)
  // .chain(crawler)

// Run
crawler(['https://ecourse.cpe.ku.ac.th/'])
// crawler(['https://www.ku.ac.th/web2012'])
// crawler(['http://www.kuappstore.ku.ac.th/index.html'])
  .eval(Future.of(initState))
  .value(beautifulLog)
  // .eval(Future.of(initState))
  // .value(_.forEach(fold(noop, beautifulLog)))