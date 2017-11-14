const { Crawler } = require('./dependencies')

const analyzer = require('./analyzer')
const downloader = require('./downloader')
const scheduler= require('./scheduler')
const storage = require('./storage')

// Setup
const instance = new Crawler({
  timeout: 5000, // 5000
  maxConnections: 10, // 10
  retries: 3, // 3
  jQuery: 'cheerio', // 'cheerio'
  forceUTF8: true // true
})

const crawler = downloader(analyzer(scheduler, storage), instance)

// Run
// crawler(['https://www.ku.ac.th/web2012'])
crawler(['https://ecourse.cpe.ku.ac.th/'])
  .runIO()