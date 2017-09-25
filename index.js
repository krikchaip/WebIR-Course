// TODO: parent link logging
//       เพื่อดูว่าจำเป็นต้องลบ link ที่เป็น qs หรือไม่
// TODO: จัดการกับ URI.origin/robots.txt
// TODO: ทำ counter ไว้นับจำนวน request

// ##### dependencies #####

const R = require('ramda')
// const {  } = require('ramda-fantasy')
const Crawler = require('crawler')
const Seenreq = require('seenreq')
const Urlparse = require('url-parse')

// ##### configurations #####

const linkDb = new Seenreq()
const crawler = new Crawler()
const seedUrl = 'http://www.ku.ac.th/web2012/'

// ##### functions #####

// TODO: compose logger หลายๆตัวรวมเป็นกลุ่มเดียว
const tap2Log = (tag, what2Log = R.identity) => R.tap(x => (
  console.log('##### @', tag),
  console.log(what2Log(x))
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

function callback(err, res, done) {
  const nextRequests = R.pipe(
    tap2Log('href', R.path([ 'request', 'uri', 'href' ])),
    tap2Log('depth level', R.path([ 'options', 'depth' ])),
    nextUrls,
    tap2Log('to be put in queue'),
    R.map(uri => ({
      uri,
      callback,
      depth: res.options.depth + 1
    }))
  )(res)

  // !! WARNING: SIDE CAUSES/EFFECTS !!
  // non-blocking operation
  crawler.queue(nextRequests)
  done()
}

// !! WARNING: SIDE CAUSES/EFFECTS !!
// initialize with seed url
crawler.queue({ uri: seedUrl, callback, depth: 0 })