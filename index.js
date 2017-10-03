// TODO: ทำ counter ไว้นับจำนวน request ที่ success
// TODO: จัดการกับ URI.origin/robots.txt
// TODO: parent link logging

// ##### dependencies #####

const R = require('ramda')
// const {  } = require('ramda-fantasy')
const Crawler = require('crawler')
const Seenreq = require('seenreq')
const Urlparse = require('url-parse')

// ##### configurations #####

const linkDb = new Seenreq()
const crawler = new Crawler({ retries: 0 })
const seedUrl = 'http://www.ku.ac.th/web2012/'

// ##### functions #####

// TODO: compose logger หลายๆตัวรวมเป็นกลุ่มเดียว
const tapLog = (tag, what = R.identity) => R.tap(x => (
  console.log('##### @', tag),
  console.log(what(x))
))

const isHtmlResponse = R.pathSatisfies(
  R.test(/text\/html/),
  ['headers', 'content-type']
)

const isKuSite = R.allPass([
  R.propSatisfies(R.complement(R.isEmpty), 'slashes'),
  R.propSatisfies(R.test(/^http(s)?:/), 'protocol'),
  R.propSatisfies(R.test(/ku\.ac\.th$/), 'hostname')
])

const sanitizeUrl = R.pipe(
  R.unary(Urlparse),
  x => (x.set('query', ''), x.set('hash', ''), x)
)

const passQueueingConditions = R.allPass([
  isKuSite,
  x => !linkDb.exists(x.href) // !! WARNING: SIDE CAUSES/EFFECTS !!
])

// IIFE with empty array initialized
const filteredUrls = $ => (arr => {
  $('a').each(function() {
    const candidateUrl = sanitizeUrl($(this).attr('href'))

    if(passQueueingConditions(candidateUrl)) {
      arr.push(candidateUrl.href)
    }
  })

  return arr
})([])

const nextUrls = R.ifElse(
  isHtmlResponse,
  R.pipe(R.prop('$'), filteredUrls),
  R.always([])
)

// ##### application #####

function foo(limit) {

  const nextRequests = R.pipe(
    // tapLog('href', R.path(['request', 'uri', 'href'])),
    nextUrls,
    // tapLog('to be put in queue'),
    R.map( uri => ({ uri, callback }) )
  )

  crawler.queue({ uri: seedUrl, callback })

  function callback(err, res, done) {
    if(limit-- > 0) crawler.queue(nextRequests(res)) // !! WARNING: SIDE CAUSES/EFFECTS !!
    console.log(crawler.queueSize)
    done()
  }

}

foo(10)