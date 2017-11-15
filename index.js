// TODO: [] excludes other filename extensions than HTML
// TODO: [] log each loaded page(do it like you did on scheduler)
// TODO: [] no CPS functions!!
// TODO: [] use Either monad instead of Maybe
// TODO: [] one big refactor
// TODO: [] write steps for each function above
// FIXME: [] overwhelming memory usage(see log file for more information)

const R = require('ramda')
const { Crawler, Seenreq } = require('./dependencies')

const analyzer = require('./analyzer')
const downloader = require('./downloader')
const scheduler = require('./scheduler')
const storage = require('./storage')

// Setup
const initState = { limit: 10000, waiting: [] }
const seed = ['https://www.ku.ac.th/web2012']
const instance = new Crawler({
  timeout: 5000, // 5000
  maxConnections: 10, // 10
  retries: 0, // 3
  retryTimeout: 5000, // 10000
  jQuery: 'cheerio', // 'cheerio'
  forceUTF8: true // true
})
const db = new Seenreq()

const crawler = R.curry((state, result) =>
  scheduler(
    downloader(
      analyzer(
        crawler,
        storage,
        db
        ),
      instance),
    state,
    result))

// Run
crawler(initState, seed)