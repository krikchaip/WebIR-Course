// =================================================================================================
// #################################### @ functional version @ #####################################
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
// ### CrawlerState :: { limit: Number, seed: [String], waiting: [String?] }
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
const without = _.curry((URLprops, cResults) => {
  const toHref = _.pipe(_.map(_.prop('href')), _.invoker(1, 'getOrElse')(''))
  const cleanProps = _.tap(URLobj => _.forEach(prop => URLobj[prop] = '', URLprops))
  const withoutProps = _.pipe(_.unary(ignoreErrParse), _.map(cleanProps), toHref)
  return _.over(_.lensProp('results'), _.map(withoutProps), cResults)
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
const trimSeed = cs => {
  let excess = cs.seed.length - cs.limit
  return excess > 0 ? {
    limit: cs.limit,
    seed: _.dropLast(excess, cs.seed),
    waiting: _.takeLast(excess, cs.seed)
  } : cs
}

// :: Number -> CrawlerState -> CrawlerState
const limitSub = _.curry((success, cs) =>
  _.over(_.lensProp('limit'), limit => limit - success, cs))

const recCrawl = crawler => {
  const m_trimSeed = _.map(trimSeed)
  const m_seedDbCheck = _.chain(_.pipe(_.prop('seed'), dbCheck))
  const m_clean = _.map(without(['hash', 'search']))
  const m_cleanResults = _.pipe(m_seedDbCheck, _.chain(_.pipe(crawler, m_clean)))
  const m_limitSub = _.pipe(_.map(_.pipe(_.prop('success'), limitSub)), _.invoker(1, 'ap'))

  // TODO: [] เอาอันใหม่ที่ได้ไป filter กับ db
  // TODO: [] เอาผลลัพธ์ที่ filter แล้วไปใส่ใน waiting
  // TODO: [] เท url จาก waiting เข้ามาใน seed ให้หมด
  // TODO: [] loop ต่อถ้า limit > 0 else return
  const rec = () => __.State.get
    .chain(() => __.State.modify(m_trimSeed))
    .chain(() => __.State.gets(m_cleanResults))
    .chain(m_cr => __.State.modify(m_limitSub(m_cr)))

  return __.State.modify(readerFuture.of).chain(rec)
}

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
  isSuccessful(res).chain(success =>
  __.Maybe.toMaybe(res.$).chain($ =>
    ignoreErrParse(res.options.uri).chain(base => {
      mutable.success = success ? mutable.success + 1 : mutable.success
      $('a').each(function (i, elem) {
        let href = ignoreErrParse($(this).attr('href'), _.always(base)).getOrElse('')
        if (_.allPass(conditions)(href))
          mutable.results.push(href.href)
      })
    })
  ))

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
  _.pipe(fileExtensionsRegex, _.constructN(1, RegExp), _.test, _.complement)
    (excludedExtensions) // not file shit?
]

const URLcrawler = crawler(URLs(filterConditions))
const webSpider = recCrawl(URLcrawler)

// !! WARNING: SIDE CAUSES/EFFECTS !!
// start program
// URLcrawler(['http://www.ku.ac.th/web2012'])
//   .map(without(['hash', 'search']))
//   .run({ db: new Seenreq(), instance: new Crawler({ retries: 0, timeout: 10000 }) })
//   .fork(console.log, console.log)
webSpider
  // .eval({ limit: 100, seed: ['http://www.ku.ac.th/web2012'], waiting: [] })
  .eval({ limit: 1, seed: ['https://www.cpe.ku.ac.th', 'https://ecourse.cpe.ku.ac.th'], waiting: [] })
  .run({ db: new Seenreq(), instance: new Crawler({ retries: 0, timeout: 10000 }) })
  .fork(console.log, console.log)