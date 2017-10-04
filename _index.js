// ##### @ imperative version

// TODO: [x] counter ไว้นับจำนวน request ที่ success
// TODO: [x] จะ download แค่ file ที่เป็น .htm/.html
// TODO: [x] บันทึก hostname ที่มี robots.txt ลงไฟล์

// FIXME: [x] ไม่ request ไปหา url ที่ไม่ใช่ webpage
// FIXME: [x] ถ้า remaining หมดแล้วต้องให้หยุดการทำงานเลยทันที
// FIXME: [] บาง page สามารถ access ไปที่ /robots.txt ได้แต่ไม่ใช่ไฟล์มันจริงๆ

////////////////////////////////////////////////////////////////////////////////

// const R = require('ramda')
// const {  } = require('ramda-fantasy')
const Crawler = require('crawler')
const Seenreq = require('seenreq')
const URLparse = require('url-parse')
const FsPath = require('fs-path')

const visitedURLdb = new Seenreq()
const crawler = new Crawler({ retries: 0, timeout: 5000 })
const robotsTxtCrawler = new Crawler({
  retries: 0,
  timeout: 5000,
  callback: onSuccessWillAppend
})

const seedURL = 'https://www.ku.ac.th/web2012'
const limit = process.argv[2] || 100

////////////////////////////////////////////////////////////////////////////////

let remaining = limit
let successRequests = 0
let htmlFiles = 0

let visitedHosts = {}
let robotsTxtList = []

// start crawling with initialized url
crawler.queue({ uri: seedURL, callback: onResponse })

crawler.on('drain', function() {
  console.log(`\n\t##### !!! start crawling hosts whether it has 'robots.txt' or not\n`)

  // start another crawler which focus crawling on robots.txt
  visitedHosts = Object.keys(visitedHosts).map(host => `https://${host}/robots.txt`)
  robotsTxtCrawler.queue(visitedHosts)

  // summary section
  robotsTxtCrawler.on('drain', function () {
    console.log(`\n\t##### !!! success requests : ${successRequests} from total of ${limit}`)
    console.log(`\t##### !!! total htm/html files : ${htmlFiles}`)
    console.log(`\t##### !!! total hostnames that have the robots.txt file : ${robotsTxtList.length}`)

    FsPath.writeFile(
      `./robots_txt_list.txt`,
      robotsTxtList.join('\n'),
      err => { if(err) console.log(err) }
    )

  })

})

function onResponse(err, res, done) {
  // array contains next request objects -> { uri, callback }
  let nextRequests = []

  // current response's uri
  let uri = URLparse(res.options.uri)
  let path = uri.pathname ? uri.pathname : '/'
  let filename = path.split('/').reverse()[0]
  filename = /\.\w+$/.test(filename) ? filename : ''

  // cached hostname (use later on checking 'robots.txt')
  if(!visitedHosts[uri.hostname]) visitedHosts[uri.hostname] = true

  // process only text/html response type
  if(!res['headers']) return done()
  else if( /text\/html/.test(res['headers']['content-type']) ) {
    let { $ } = res

    // extract urls from 'a' tag with some *criterias*
    $('a').each(function(i, elem) {
      let parsedHref = URLparse( $(this).attr('href') )
      let parsedPath = parsedHref.pathname ? parsedHref.pathname : '/'
      let parsedFilename = parsedPath.split('/').reverse()[0]
      parsedFilename = /\.\w+$/.test(parsedFilename) ? parsedFilename : ''

      // sanitize querystring and hash string
      parsedHref.set('query', '')
      parsedHref.set('hash', '')

      // *criterias*
      // - contains slashes
      // - http or https
      // - only KU domain
      // - is a webpage
      // - unvisited url
      if(
        parsedHref['slashes'] &&
        /^http(s)?:/.test(parsedHref['protocol']) &&
        /ku\.ac\.th$/.test(parsedHref['hostname']) &&
        /^$|\.(php|htm|html)$/.test(parsedFilename) &&
        !visitedURLdb.exists(parsedHref['href'])
      ) { nextRequests.push({ uri: parsedHref['href'], callback: onResponse }) }

    })

    // download to html/.../filename
    if (/\.(htm|html)$/.test(filename)) {
      let hostPath = uri.hostname + path
      FsPath.writeFile(`./html/${hostPath}`, res.body, function (err) {
        if (err) return done(err)
        else htmlFiles++
      })
    }

  }

  console.log('--------------------------------------------------------------------------------')
  console.log('##### @ request number', successRequests + 1)
  console.log('##### @ href', res.request.uri.href)
  console.log('##### @ path', path)
  console.log('##### @ file', filename)
  // console.log('##### @ to be put in queue')
  // console.log(nextRequests.map(x => x.uri))
  // console.log('##### @ remaining', remaining)
  console.log()

  // repeat until reached limit requests
  successRequests++
  if(nextRequests.length <= remaining && nextRequests.length > 0) {
    remaining -= nextRequests.length
    crawler.queue(nextRequests)
  }

  done()

}

function onSuccessWillAppend(err, res, done) {
  let uri = URLparse(res.options.uri)
  let hasOrNot = ''

  // checking validity
  if(res.statusCode === 200) {
    hasOrNot = `has 'robots.txt' file!!!`
    robotsTxtList.push(uri.hostname)
  }

  console.log('--------------------------------------------------------------------------------')
  console.log('##### @ hostname', uri.hostname, hasOrNot)
  console.log()

  done()
}