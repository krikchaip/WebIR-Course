// ##### @ imperative version

// TODO: [x] counter ไว้นับจำนวน response ที่ success
// TODO: [x] จะ download แค่ file ที่เป็น .htm/.html
// TODO: [x] บันทึก hostname ที่มี robots.txt ลงไฟล์
// TODO: [x] URL normalization - complete relative URL to absolute one
// TODO: [x] add exclusion filename extensions
// TODO: [x] download robot.txt ของ web ที่มีด้วยเพื่อจะได้ check ความถูกต้องได้

// FIXME: [x] ไม่ request ไปหา url ที่ไม่ใช่ webpage
// FIXME: [x] ถ้า remaining หมดแล้วต้องให้หยุดการทำงานเลยทันที
// FIXME: [x] บาง page สามารถ access ไปที่ /robots.txt ได้แต่ไม่ใช่ตัวไฟล์ robots.txt จริงๆ
// FIXME: [] ถ้าหาก filename จากการ split path ด้วย '/' ไม่ได้อยู่ที่ตัวสุดท้ายของ list หล่ะ?

////////////////////////////////////////////////////////////////////////////////

// const R = require('ramda')
// const {  } = require('ramda-fantasy')
const Crawler = require('crawler')
const Seenreq = require('seenreq')
const FsPath = require('fs-path')
const { URL } = require('url')

const visitedURLdb = new Seenreq()
const crawler = new Crawler({ retries: 0, timeout: 10000 })
const robotsTxtCrawler = new Crawler({
  retries: 0,
  timeout: 5000,
  callback: onSuccessWillDownload
})

const seedURL = 'https://www.ku.ac.th/web2012'
const limit = process.argv[2] || 10000

////////////////////////////////////////////////////////////////////////////////

let remaining = limit
let successResponses = 0
let htmlFiles = 0

let visitedHosts = {}
let robotsTxtList = []

// start crawling with initialized url
crawler.queue({ uri: seedURL, callback: onResponse })

crawler.on('drain', function() {
  console.log(`\n\t##### !!! start crawling hosts whether it has 'robots.txt' or not\n`)

  // start another crawler which focus crawling on robots.txt
  visitedHosts = Object.keys(visitedHosts).map(host => ({
    uri: `${host}/robots.txt`,
    jQuery: false
  }))
  robotsTxtCrawler.queue(visitedHosts)

  // summary section
  robotsTxtCrawler.on('drain', function () {
    console.log(`\n\t##### !!! success requests : ${successResponses} from total of ${limit}`)
    console.log(`\t##### !!! have different : ${visitedHosts.length} hostnames`)
    console.log(`\t##### !!! total htm/html files : ${htmlFiles}`)
    console.log(`\t##### !!! total hostnames that have the robots.txt file : ${robotsTxtList.length}`)

    FsPath.writeFile(
      `./robots_txt_list/summary/summary.txt`,
      robotsTxtList.join('\n'),
      err => { if(err) console.log(err) }
    )

  })

})

function onResponse(err, res, done) {
  // array contains next request objects -> { uri, callback }
  let nextRequests = []

  // current response's url
  let currentURL = new URL(res.options.uri)
  let currentFilename = currentURL.pathname.split('/').reverse()[0]
  currentFilename = /\.\w+$/.test(currentFilename) ? currentFilename : ''

  // cached origin url (use later on checking 'robots.txt')
  if(!visitedHosts[currentURL.origin]) visitedHosts[currentURL.origin] = true

  // process only text/html response type
  if(!res.headers) return done()
  else if( /text\/html/.test(res.headers['content-type']) ) {
    let { $ } = res

    // extract urls from 'a' tag with some *criterias*
    $('a').each(function(i, elem) {
      let url
      try { url = new URL($(this).attr('href'), currentURL) }
      catch (err) { return false }

      let filename = url.pathname.split('/').reverse()[0]
      filename = /\.\w+$/.test(filename) ? filename : ''

      // sanitize hash and querystring
      url.hash = ''
      url.search = ''

      // *criterias*
      // - http or https
      // - only KU domain
      // - not listed in exclusion
      // - unvisited url
      try {
        if(
          /^http(s)?:/.test(url.protocol) &&
          /ku\.ac\.th$/.test(url.hostname) &&
          !/\.(pdf|doc(x)?|jpg|rar|xls(x)?|png|ppt(x)?|zip|dotx|exe|rtf)$/i.test(filename) &&
          !visitedURLdb.exists(url.href)
        ) { nextRequests.push({ uri: url.href, callback: onResponse }) }
      }
      catch (err) { return false }

    })

    // download to html/.../filename
    if (/\.(htm|html)$/.test(currentFilename)) {
      let path = './html/' + currentURL.hostname + currentURL.pathname
      FsPath.writeFile(path, res.body, function (err) {
        if (err) return done(err)
        else htmlFiles++
      })
    }

  }

  console.log('--------------------------------------------------------------------------------')
  console.log('##### @ response number', successResponses + 1)
  console.log('##### @ href', currentURL.href)
  console.log('##### @ path', currentURL.pathname)
  console.log('##### @ file', currentFilename)
  // console.log('##### @ to be put in queue')
  // console.log(nextRequests.map(x => x.uri))
  // console.log('##### @ remaining', remaining)
  console.log('--------------------------------------------------------------------------------\n')

  // repeat until reached limit requests
  successResponses++
  if(nextRequests.length <= remaining && nextRequests.length > 0) {
    remaining -= nextRequests.length
    crawler.queue(nextRequests)
  }

  done()

}

function onSuccessWillDownload(err, res, done) {
  let url
  try { url = new URL(res.options.uri) }
  catch (err) { return done() }
  // let url = new URL(res.options.uri)
  let path = './robots_txt_list/' + url.hostname

  // checking availability and process only with 'text/plain' MIME type
  if(res.statusCode === 200 && /text\/plain/.test(res.headers['content-type'])) {
    console.log(`##### @ hostname ${url.hostname} has 'robots.txt' file!!!`)

    robotsTxtList.push(url.hostname)

    FsPath.writeFile(path, res.body, function(err) {
      if(err) return done(err)
    })
  }

  done()
}