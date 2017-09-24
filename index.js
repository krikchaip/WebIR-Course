// TODO: parent link logging 
//       เพื่อดูว่าจำเป็นต้องลบ link ที่เป็น qs หรือไม่
// TODO: อ่านวิธีการเขียน crawler ที่ดีจาก slides

// ##### dependencies #####

const R = require('ramda')
const {  } = require('ramda-fantasy')
const Crawler = require('crawler')
const Seenreq = require('seenreq')
const Urlparse = require('url-parse')

// ##### configurations #####

const linkDb = new Seenreq()
const crawler = new Crawler()
const seedUrl = 'https://www.cpe.ku.ac.th'

// ##### pointfree functions #####

const isKuSite = R.pipe(
  R.unary(Urlparse), // prevent side effects
  R.allPass([
    R.propSatisfies(R.complement(R.isEmpty), 'slashes'),
    R.propSatisfies(R.test(/^http(s)?:/), 'protocol'),
    R.propSatisfies(R.test(/ku\.ac\.th$/), 'hostname')
  ])
)

const isHtml = R.pathSatisfies(
  R.test(/text\/html/),
  ['headers', 'content-type']
)

const nextLevelUrls = R.ifElse(
  isHtml,
  R.pipe(R.prop('$'), filteredUrls),
  R.always([])
)

// ##### functions (expression style) #####

// ใช้ R.allPass ไม่ได้ไม่รู้เพราะว่าอะไร?
const passQueueingConditions = url =>
  isKuSite(url) && !linkDb.exists(url)

// IIFE with empty array initialized
const filteredUrls = $ => (arr => {
  $('a').each(function() {
    const candidateUrl = $(this).attr('href')
    if(passQueueingConditions(candidateUrl)) {
      arr.push(candidateUrl)
    }
  })

  return arr
})([])

// ##### application #####

// initialize with seed url
crawler.queue({ uri: seedUrl, callback })

function callback(err, res, done) {
  const nextLevelReqs = R.pipe(
    R.tap(x => console.log('##### @', x.request.uri.href)),
    R.tap(x => console.log('##### @ content-type', x.headers['content-type'])),
    nextLevelUrls,
    R.tap(x => ( console.log('##### @ nextLevelUrls'), console.log(x) )),
    R.map( uri => ({ uri, callback }) ),
    // R.tap(x => ( console.log('##### @ nextLevelReqs'), console.log(x) )),
  )(res)

  crawler.queue(nextLevelReqs) // non-blocking operation
  done()
}