// =================================================================================================
// #################################### @ functional version @ #####################################
// FIXME: doesn't actually check filename extensions
// =================================================================================================

const _ = require('ramda')
const __ = require('ramda-fantasy')

const Crawler = require('crawler')
const Seenreq = require('seenreq')
const Fspath = require('fs-path')
const { URL } = require('url')

// =================================================================================================
// ##################################### @ helper functions @ ######################################
// ### Env :: { db: Seenreq, instance: Crawler }
// ### Callback m :: Mutator (err res done) m
// ### CrawlerResults :: { results: [String], success: Number }
// ### CrawlerState :: { limit: Number, seed: [String], waiting: [String] }
// =================================================================================================

// :: (r -> Future e a) -> ReaderT r Future e a
const readerFuture = __.Reader.T(__.Future)

// :: String -> Mutator -> Mutable -> { uri: String, callback: Callback m }
const request = _.curry((uri, mutator, mutable) => ({ uri, callback: mutator(mutable) }))

// :: Callback CrawlerResults -> [String] -> ReaderT Env Future (Error CrawlerResults)
const crawler = _.curry((lookfor, targetURLs) => {
  return readerFuture(({ instance }) => __.Future((reject, resolve) => {
    let mutable = { results: [], success: 0 }
    let reqs = _.lift(request)(targetURLs, [lookfor], [mutable])

    try { instance.queue(reqs), instance.once('drain', () => resolve(mutable)) }
    catch (err) { reject(err) }
  }))
})

// :: [String] -> CrawlerResults -> CrawlerResults
const without = _.curry((URLprops, cr) => {
  const cleaner = str => ignoreErrParse(str)
    .map(_.tap(url => URLprops.forEach(prop => url[prop] = '')))
    .map(_.prop('href'))
    .getOrElse('')

  return Object.assign(cr, { results: cr.results.map(cleaner) })
})

// :: [a] -> [Boolean] -> [a]
const pairFilter = _.curry((targetArr, filterArr) => {
  let results = []
  let max = targetArr.length > filterArr.length ?
    filterArr.length : targetArr.length

  for (let index = 0; index < max; index++)
    if (filterArr[index]) results.push(targetArr[index])

  return results
})

// :: [String] -> ReaderT Env Future (Error [String])
const dbCheck = urls => readerFuture(({ db }) => {
  return __.Future((reject, resolve) => {
    let sanitized = _.uniq(urls)
    let filterby = pairFilter(sanitized)
    let cb = (err, result) => err ?
      reject(err) : resolve(filterby(result.map(_.not)))

    try { db.exists(sanitized, cb) } catch (err) { reject(err) }
  })
})

// :: CrawlerState -> CrawlerState
const trimOrDump = cs => {
  let { limit, seed, waiting } = cs
  let excess = seed.length - limit
  return excess > 0 ?
    { limit, seed: _.dropLast(excess, seed), waiting: waiting.concat(_.takeLast(excess, seed)) } :
    { limit, seed: seed.concat(_.take(-excess, waiting)), waiting: _.drop(-excess, waiting) }
}

// :: Number -> CrawlerState -> CrawlerState
const limitSub = _.curry((success, cs) =>
  Object.assign(cs, { limit: cs.limit - success }))

// :: [String] -> CrawlerState -> CrawlerState
const enqueue = _.curry((r, cs) =>
  Object.assign(cs, { seed: [], waiting: _.concat(cs.waiting, r) }))

// :: CrawlerState -> ()
const stateLogger = s => {
  console.log('remaining', s.limit)
}

// :: ([String] -> CrawlerResultsM) -> CrawlerState -> CrawlerStateM
// CrawlerResultsM = ReaderT Env Future (Error CrawlerResults)
// CrawlerStateM = ReaderT Env Future (Error CrawlerStateM)
const recCrawl = _.curry((crawler, initState) => {
  const getResults = _.pipe(_.prop('seed'), crawler)
  const sanitize = without(['hash', 'search'])
  const rec = stateM => {
    let fitLimit = _.map(trimOrDump, stateM)
    let cleanResults = _.chain(_.pipe(getResults, _.map(sanitize)), fitLimit)
    let nextSeed = _.chain(_.pipe(_.prop('results'), dbCheck), cleanResults)
    let nextLimit = _.lift(limitSub)(_.map(_.prop('success'), cleanResults), fitLimit)
    let nextState = _.lift(enqueue)(nextSeed, nextLimit)

    return nextState.map(_.tap(stateLogger)).chain(ns => ns.limit > 0 ?
      rec(readerFuture.of(ns)) : readerFuture.of(ns))
  }
  return rec(readerFuture.of(initState))
})

// :: String -> (a -> URL|String)? -> Maybe URL
const ignoreErrParse = (url, base = _.identity) => {
  try { return __.Maybe.Just(new URL(url, base(url))) }
  catch (_) { return __.Maybe.Nothing() }
}

// :: URL -> Maybe String
const fileWithExtension = url => {
  const filename = _.pipe(_.prop('pathname'), _.split('/'), _.last)
  const extension = str => /\.\w+$/.test(str) ? __.Maybe.Just(str) : __.Maybe.Nothing()
  return _.pipe(filename, extension)(url)
}

// :: CSV -> RegExp
// CSV = String
const fileExtensionsRegex = csv => {
  const sanitize = _.replace(/[^,\w]/gm, '')
  const comma2pipe = _.replace(/,/g, '|')
  const extensionForm = str => `\\.(${str})$`
  return _.pipe(_.toLower, sanitize, comma2pipe, extensionForm)(csv)
}

// :: http.IncomingMessage -> Maybe Boolean
const isSuccessful = res => {
  const statusCode = _.pipe(_.prop('statusCode'), __.Maybe.toMaybe)
  const whether2xx = _.pipe(_.map(String), _.map(_.test(/^2\d\d$/)))
  return _.pipe(statusCode, whether2xx)(res)
}

// :: [Predicate] => Callback CrawlerResults
const URLs = conditions => mutable => (err, res, done) => {
  let success = isSuccessful(res)
  let jQuery = __.Maybe.toMaybe(res.$)
  let base = ignoreErrParse(res.options.uri)
  let extract = ($, b) => {
    let results = []
    let op = $('a').each(function (i, elem) {
      let href = $(this).attr('href')
      let url = ignoreErrParse(href, _.always(b)).getOrElse('')

      if(_.allPass(conditions)(url))
        results.push(url.href)
    })

    return results
  }

  mutable.success += success.getOrElse(false)
  mutable.results = mutable.results
    .concat(_.lift(extract)(jQuery, base).getOrElse([]))

  return done()
}

// =================================================================================================
// =================================================================================================

// TODO: pick from process.argv custom parameters (hint: use IO monad)
// eg: node index --exclude "..."
const excludedExtensions = 'pdf,doc,docx,jpg,rar,xls,xlsx,png,ppt,pptx,zip,dotx,exe,rtf'

// checking whether url exists in db shouldn't present here.
// (it should be checked everytime when the response has succeeded)
const filterConditions = [
  _.propSatisfies(_.test(/^http(s)?:/), 'protocol'), // is http/https protocol?
  _.propSatisfies(_.test(/ku\.ac\.th$/), 'hostname'), // is KU domain?
  _.pipe(fileExtensionsRegex, _.constructN(1, RegExp), _.test, _.complement
    (excludedExtensions) // not file shit?
]

const URLcrawler = crawler(URLs(filterConditions))
const webSpider = recCrawl(URLcrawler)

// !! WARNING: SIDE CAUSES/EFFECTS !!
// start program
// webSpider({ limit: 10, seed: ['https://ecourse.cpe.ku.ac.th', 'https://www.cpe.ku.ac.th'], waiting: [] })
// webSpider({ limit: 1, seed: ['http://www.ku.ac.th/web2012', 'https://ecourse.cpe.ku.ac.th'], waiting: [] })
webSpider({ limit: 100, seed: ['https://www.ku.ac.th/web2012'], waiting: [] })
  .run({ db: new Seenreq(), instance: new Crawler({ retries: 0, timeout: 10000 }) })
  .fork(console.log, value => {
    console.log('\nfinal state')
    console.log(value)
  })