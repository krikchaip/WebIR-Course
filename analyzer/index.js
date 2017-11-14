const R = require('ramda')
const { Maybe,
        Nothing,
        Just,
        fromNullable,
        Future,
        isFuture,
        URL } = require('../dependencies')

const pairFilter = R.curry(R.pipe(R.zip, R.filter(([x, b]) => !!b), R.map(R.head)))

// // test
// console.log(pairFilter(['a', 'b', 'c'], [true, false, true]))
// console.log(pairFilter(['a', 'b', 'c'])([true, false, true]))

const uniqHrefs = R.pipe(R.map(R.prop('href')), R.uniq)

const duplicateEliminator = R.curry((db, current, urls) =>
  Future.encaseN(db.exists.bind(db))(current)
  .chain(() =>
    Future.of(uniqHrefs(urls))
    .chain(raw =>
      Future.encaseN(db.exists.bind(db))(raw)
      .map(xs => pairFilter(raw, xs.map(R.not))))))

const rejectNotification = cause => e =>
  console.error(`"${cause}" has run with error: ${e}`)

const resolveNotification = cause => r =>
  console.log(`"${cause}" has successfully run with discarded result "${r}"`)

const executeF = R.curry((f, x) =>
  isFuture(f) ? f.map(g => g(x)) : Future.encase(f, x))

const forkVirtual = R.curry((fst, snd, join, shared) =>
  join
    ? Future.both(executeF(fst, shared), executeF(snd, shared))
    : Future((reject, resolve) => {
        executeF(fst, shared).fork(reject, r => resolve([r]))
        executeF(snd, shared).fork(
          rejectNotification('second function'),
          resolveNotification('second function'))
      }))

const currentDirectoryNotHTML = cause => () =>
  console.error(`"${cause}": is not directly HTML, download terminated`)

const filename = R.pipe(
  R.split('/'),
  R.last,
  R.ifElse(R.test(/\.\w+$/), Just, Nothing))

const HTMLpath = raw =>
  Maybe.of(new URL(raw))
  .chain(u =>
    filename(u.pathname)
    .chain(
      R.ifElse(R.test(/\.(htm|html)$/),
      R.always(Just(u)),
      Nothing)))

const contentFilter = R.curry((storage, { content: { html, uri } }) =>
  HTMLpath(uri)
  .map(u =>
    () => storage(({ dir: `./html/${u.hostname}${u.pathname}`, html })))
  .getOrElse(currentDirectoryNotHTML(uri))())

// // test
// contentFilter(
//   require('../storage'),
//   { content: { html: `<html></html>`,
//                uri: `https://www.google.com/a.html` } })

const URLfilter = ({ urls }) =>
  R.filter(
    R.allPass([
      R.propSatisfies(R.test(/^http(s)?:/), 'protocol'), // is http/https protocol?
      R.propSatisfies(R.test(/ku\.ac\.th$/), 'hostname'), // is KU domain?
    ]),
    urls)

const maybeCatch = R.tryCatch(fn => Just(fn()), e => Nothing())

const normalize = (raw, base = undefined) =>
  base ? maybeCatch(() => new URL(raw, base))
       : maybeCatch(() => new URL(raw))

const URLextract = R.curry(($, base) =>
  R.tap(urls =>
    $('a').each(function () {
      normalize($(this).attr('href'), base)
      .map(R.tap(url => (url['hash'] = '', url['search'] = '', url)))
      .map(R.tap(url => urls.push(url)))
    }), []))

const parser = res =>
  fromNullable(res.$)
  .map($ => ({
    content: { html: $.html(), uri: res.options.uri },
    urls: URLextract($, res.options.uri)
  }))

module.exports = R.curry((scheduler, storage, db, res) =>
  parser(res)
    .map(forkVirtual(URLfilter, contentFilter(storage), false))
    .map(
      Future.fork(
        console.error,
        ([urls]) =>
          duplicateEliminator(db, res.options.uri, urls)
          .fork(console.error, scheduler))))