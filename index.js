// TODO: [] excludes other filename extensions than HTML
// TODO: [] log each loaded page(do it like you did on scheduler)
// TODO: [] no (, , ...) statements!!
// TODO: [] no CPS functions!!
// TODO: [] use Either monad instead of Maybe
// TODO: [] one big refactor
// TODO: [] write steps for each function above
// FIXME: [] overwhelming memory usage(see log file for more information)

const _ = require('ramda')
const { fold, Future, Crawler, Seenreq } = require('./dependencies')

// Setup
const initState = { limit: 10, waiting: [] }
const db = new Seenreq()
const instance = new Crawler({
  timeout: 5000, // 5000
  maxConnections: 10, // 10
  retries: 0, // 3
  retryTimeout: 5000, // 10000
  jQuery: 'cheerio', // 'cheerio'
  forceUTF8: true // true
})

// const analyzer = require('./analyzer')
const downloader = require('./downloader')(instance)
const scheduler = require('./scheduler')
// const storage = require('./storage')

const crawler = seed =>
  scheduler(seed)
  .chain(downloader)

// Run
crawler(['https://ecourse.cpe.ku.ac.th'])
  .eval(Future.of(initState))
  .value(_.forEach(res => console.log(res.body)))