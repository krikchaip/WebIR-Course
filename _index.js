// ##### @ imperative version

// TODO: [x] counter ไว้นับจำนวน request ที่ success
// TODO: [] จะ download แค่ file ที่เป็น .htm/.html

// FIXME: [] ไม่ request ไปหา url ที่ไม่ใช่ webpage
// FIXME: [x] ถ้า remaining หมดแล้วต้องให้หยุดการทำงานเลยทันที

////////////////////////////////////////////////////////////////////////////////

// const R = require('ramda')
// const {  } = require('ramda-fantasy')
const Crawler = require('crawler')
const Seenreq = require('seenreq')
const URLparse = require('url-parse')
const fs = require('fs')

const crawler = new Crawler({ retries: 0, timeout: 5000 })
const visitedURLdb = new Seenreq()

const seedURL = 'https://www.ku.ac.th/web2012'
const limit = 100

////////////////////////////////////////////////////////////////////////////////

let remaining = limit
let successRequests = 0
let htmlFiles = 0

// start crawling with initialized url
crawler.queue({ uri: seedURL, callback: onResponse })

crawler.on('drain', function() {
  console.log(`\n\t##### !!! success requests : ${successRequests} from total of ${limit}`)
  console.log(`\t##### !!! total htm/html files : ${htmlFiles}`)
})

function onResponse(err, res, done) {
  // array contains next request objects -> { uri, callback }
  let nextRequests = []

  let currentPath = URLparse(res.options.uri)['pathname']
  currentPath = currentPath ? currentPath : '/'
  let currentFile = currentPath.split('/')
  currentFile = currentFile[currentFile.length - 1]
  currentFile = /\.\w+$/.test(currentFile) ? currentFile : ''

  // process only text/html response type
  if(!res['headers']) return done()
  else if( /text\/html/.test(res['headers']['content-type']) ) {
    let { $ } = res

    // extract urls from 'a' tag with some *criterias*
    $('a').each(function(i, elem) {
      let parsedHref = URLparse( $(this).attr('href') )

      // sanitize querystring and hash string
      parsedHref.set('query', '')
      parsedHref.set('hash', '')

      // *criterias*
      // - http or https
      // - contains slashes
      // - only KU domain
      // - unvisited url
      if(
        parsedHref['slashes'] &&
        /^http(s)?:/.test(parsedHref['protocol']) &&
        /ku\.ac\.th$/.test(parsedHref['hostname']) &&
        !visitedURLdb.exists(parsedHref['href'])
      ) { nextRequests.push({ uri: parsedHref['href'], callback: onResponse }) }

    })

  }

  // download to html/.../filename using stream
  if(/\.(htm|html)$/.test(currentFile)) {
    htmlFiles++
  }

  console.log('--------------------------------------------------------------------------------')
  console.log('##### @ request number', successRequests + 1)
  console.log('##### @ href', res.request.uri.href)
  console.log('##### @ path', currentPath)
  console.log('##### @ file', currentFile)
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