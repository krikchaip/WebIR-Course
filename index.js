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
// =================================================================================================

const readerFuture = __.Reader.T(__.Future)

const request = _.curry((uri, mutator, _state) => ({ uri, callback: mutator(_state) }))

const crawler = _.curry((lookfor, seed) => {
  return readerFuture(({ instance }) => __.Future((reject, resolve) => {
    let _state = { current: seed.slice(), next: [] }
    let reqs = _.lift(request)(seed, [lookfor], [_state])

    try { instance.queue(reqs), instance.once('drain', () => resolve(_state)) }
    catch (err) { reject(err) }
  }))
})

const visited = _.curry((urls, { db }) => __.Future((reject, resolve) =>
  db.exists(urls, (err, result) => err ? reject(err) : resolve([urls, result]))
))

const pairFilter = (value, bool) => bool ? value : undefined

// TODO: refactor
const dbCheck = ({ current, next }) => readerFuture(visited(current))
  .chain(() => _.pipe(_.uniq, visited, readerFuture)(next))
  .map(([urls, exists]) => _.zipWith(pairFilter, urls, exists.map(_.not)).filter(_.identity))

const ignoreErrParse = (url, base = _.identity) => {
  try { return __.Maybe.Just(new URL(url, base(url))) }
  catch (_) { return __.Maybe.Nothing() }
}

const fileWithExtension = url => {
  const filename = _.pipe(_.prop('pathname'), _.split('/'), _.last)
  const extension = str => /\.\w+$/.test(str) ? __.Maybe.Just(str) : __.Maybe.Nothing()
  return _.pipe(filename, extension)(url)
}

const fileExtensionsRegex = csv => {
  const sanitize = _.replace(/[^,\w]/gm, '')
  const comma2pipe = _.replace(/,/g, '|')
  const extensionForm = str => `\\.(${str})$`
  return _.pipe(_.toLower, sanitize, comma2pipe, extensionForm)(csv)
}

// TODO: refactor
const URLs = conditions => _state => (err, res, done) => {
  let base = ignoreErrParse(res.options.uri)
  let urls = __.Maybe.toMaybe(res.$).map($ => {
    let _results = []

    $('a').each(function (i, elem) {
      let href = base
        .chain(url => ignoreErrParse($(this).attr('href'), _.always(url)))
        .map(url => (url.hash = '', url.search = '', url))
        .getOrElse('')

      if (_.allPass(conditions)(href)) _results.push(href)
    })

    return _results
  })

  _state.next = _state.next.concat(urls.map(_.pluck('href')).getOrElse([]))

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
  _.pipe(fileExtensionsRegex, _.constructN(1, RegExp), _.test, _.complement) // not file shit?
    (excludedExtensions)
]

const URLcrawler = crawler(URLs(filterConditions), ['https://www.ku.ac.th/web2012'])

// !! WARNING: SIDE CAUSES/EFFECTS !!
// start program
URLcrawler.chain(dbCheck)
  .run({ db: new Seenreq(), instance: new Crawler({ retries: 0, timeout: 5000 }) })
  .fork(console.log, console.log)