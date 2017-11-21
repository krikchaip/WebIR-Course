// TODO: [] Hindley-Milner type system on every function

const _ = require('ramda')
const { Either: { either: fold },
        Future,
        Crawler,
        SimpleDb } = require('./dependencies')

// Setup
const instance = new Crawler({
  timeout: 5000, // 5000
  maxConnections: 10, // 10
  retries: 0, // 3
  retryTimeout: 5000, // 10000
  jQuery: 'cheerio', // 'cheerio'
  forceUTF8: true // true
})
const visitedDb = new SimpleDb()
const $scheduler = require('./scheduler')
const downloader = require('./downloader')(instance)
const $analyzer = require('./analyzer')(visitedDb)

const crawler = _.curry((state, seed) =>
  $scheduler(state, seed)
  .chain(fold(
    Future.of,
    URLs =>
      downloader(URLs)
      .chain($analyzer(state))
      .chain(crawler(state)))))

// Run
const initState = {
  limit: 10000,
  counter: 0,
  html: 0,
  waiting: []
}
const seed = ['https://www.ku.ac.th/web2012']
// const seed = ['https://www.cpe.ku.ac.th']
// const seed = ['http://www.person.ku.ac.th/knows.html']
// const seed = ["http://www.fish.ku.ac.th/Oldversion/%3C%=STD_RS("]

crawler(initState, seed)
.value(console.log)