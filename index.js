// =============================================================================
// ########## @ functional version @ ##########
// TODO: [] packet-like logging with file/stdout forked
// TODO: [] raw command line args (custom initial parameters)
// =============================================================================

const R = require('ramda')
const { Maybe, IO, State } = require('ramda-fantasy')

const Crawler = require('crawler')
const Seenreq = require('seenreq')
const FsPath = require('fs-path')
const { URL } = require('url')

const visitedURLdb = new Seenreq()
const URLcrawler = new Crawler({ retries: 0, timeout: 10000 })
// const robotsTxtCrawler = new Crawler({
//   retries: 0,
//   timeout: 5000,
//   callback: onSuccessWillDownload // TODO: change to more meaningful name...
// })

// TODO: use process.argv (IO monad) with custom parameters
// eg: node index --seed "..." --limit N
const seedURL = 'https://www.ku.ac.th/web2012'
const limit = 10000
const excludedExtensions = [
  '.pdf', '.doc', '.docx', '.jpg', '.rar',
  '.xls', '.xlsx', '.png', '.ppt', '.pptx',
  '.zip', '.dotx', '.exe', '.rtf',
]


// =============================================================================
// ########## @ start crawler here @ ##########
// FIXME: [] ถ้าไม่มี response obj(error) หรือเป็น error-statuscode จะไม่นับ
// =============================================================================

// Start WebCrawler application
foo()

// TODO: ใช้ State monad เข้ามาช่วย
async function foo() {
  const { next, save } = await URLcrawl(seedURL)
}

// =============================================================================
// ########## @ helper functions @ ##########
// *** เขียน main functions จำนวนเท่าที่เห็นใน app section
// TODO: [] JSDoc over main functions
// TODO: [] Hindley-Milner type signatures for all functions
// =============================================================================

const isVisited = R.pathSatisfies( href => visitedURLdb.exists(href), ['inner', 'href'] )
const saveContent = content => URLobj => IO(() => FsPath.writeFile(
  `./html/${URLobj.inner.hostname}${URLobj.inner.pathname}`,
  content,
  R.when( R.isNil, err => console.log(err) )
))

function URLcrawl(seed) {
  return new Promise(function (resolve, reject) {
    // initialize queue with seed
    URLcrawler.queue({ uri: seed, callback: _onResponse })

    // URLcrawler's callback
    // explanation: ใช้ promise ส่งค่าจำเป็นที่ fetch ได้ออกไปข้างนอก
    // แล้วให้ข้างนอกเป็นคนทำหน้าที่ download / ตัดสินใจ crawl ในครั้งต่อไป
    function _onResponse(err, res, done) {
      const current = R.pipe( URLwithFilename, R.tap(isVisited) )
        ( new URL(res.options.uri) ) // !! WARNING: SIDE CAUSES/EFFECTS !!
      const nextRequests = R.pipe( parsableContent, extractURL(current) )
        ( res )
      const downloadHTMLcontent = R.ifElse(
        R.propSatisfies( R.test(/\.htm(l)?$/), 'filename' ),
        saveContent(res.body),
        R.always( IO.of('content-type is not HTML') )
      )( current )

      // returning Promise results
      resolve({ next: nextRequests, save: downloadHTMLcontent })

      return done()
    }

  })
}

function URLwithFilename(URLobj) {
  const pathList = URLobj.pathname.split('/')
  const hasExtensions = R.test(/\.\w+$/)
  const filenameExtractor = R.pipe( R.last, R.unless(hasExtensions, R.always('-')) )

  return { inner: URLobj, filename: filenameExtractor(pathList) }
}

function parsableContent(resObj) {
  const contentType = R.pipe( Maybe.toMaybe, R.map(R.path(['headers', 'content-type'])) )
  const isHTMLtype = R.test(/text\/html/)
  const jQuery = R.when( isHTMLtype, R.always(resObj.$) )

  return Maybe.of(jQuery).ap(contentType(resObj))
}

function extractURL(baseURL) {
  const HTTPorHTTPs = R.pathSatisfies( R.test(/^http(s)?:/), ['inner', 'protocol'] )
  const onlyKUdomain = R.pathSatisfies( R.test(/ku\.ac\.th$/), ['inner', 'hostname'] )
  const excExtsRegex = R.pipe( R.map(x => `\\${x}$`), R.join('|') )
    ( excludedExtensions )
  const likelyWebpage = R.complement( R.test(new RegExp(excExtsRegex, 'i')) )
  const haveNotSeen = R.complement(isVisited)

  // เงื่อนไขที่จะเอา url มา crawl ใน state ต่อไป
  const passCriterias = R.allPass([ HTTPorHTTPs, onlyKUdomain, likelyWebpage, haveNotSeen ])

  function urlList($) {
    let urls = []

    $('a').each(function (i, elem) {
      const url = URLwithFilename( new URL($(this).attr('href'), baseURL.inner) )

      // !! WARNING: SIDE CAUSES/EFFECTS !!
      url.inner.hash = ''
      url.inner.search = ''

      // !! WARNING: SIDE CAUSES/EFFECTS !!
      if (passCriterias(url)) {
        urls.push(url.inner.href)
      }
    })

    return urls
  }

  return maybeJQuery => Maybe.of(urlList)
    .ap(maybeJQuery)
    .getOrElse([])
}