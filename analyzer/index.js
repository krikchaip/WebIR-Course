const R = require('ramda')
const { Maybe,
        Nothing,
        Just,
        fromNullable,
        Future,
        isFuture,
        URL } = require('../dependencies')

const sequenceF = R.curry((ignoreErr, xs) => {
  const ys = []
  try { xs.forEach(x =>
        x.fork(
          e => { if(!ignoreErr) throw e },
          r => ys.push(r))) }
  catch(e) { return Future.of([]) }
  return Future.of(ys)
})

const pairFilter = R.curry(R.pipe(R.zip, R.filter(([x, b]) => !!b), R.map(R.head)))

const uniqHrefs = R.pipe(R.map(R.prop('href')), R.uniq)

const duplicateEliminator = R.curry((db, current, URLs) =>
  Future.encaseN(db.exists.bind(db))(current)
  .chain(() =>
    Future.of(uniqHrefs(URLs))
    .chain(raw =>
      Future.encaseN(db.exists.bind(db))(raw)
      .map(xs => pairFilter(raw, xs.map(R.not))))))

const rejectNotification = cause => e =>
  console.error(`"${cause}" has run with error: ${e}`)

const noop = () => {}

const executeF = R.curry((f, x) =>
  isFuture(f) ? f.map(g => g(x)) : Future.encase(f, x))

const forkVirtual = R.curry((fst, snd, join, shared) =>
  join
    ? Future.both(executeF(fst, shared), executeF(snd, shared))
    : Future((reject, resolve) => {
        const fstCancel = executeF(fst, shared).fork(reject, r => resolve([r]))
        const sndCancel = executeF(snd, shared).fork(
          rejectNotification('second function'),
          noop)
        return R.pipe(fstCancel, sndCancel)
      }))

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
  .map(u => () =>
    storage(({ dir: `./html/${u.hostname}${u.pathname}`, html }))
    .fork(console.error, () => console.log(`${uri} written`)))
  .getOrElse(noop)())

const URLfilter = ({ URLs }) =>
  R.filter(
    R.allPass([
      R.propSatisfies(R.test(/^http(s)?:/), 'protocol'), // is http/https protocol?
      R.propSatisfies(R.test(/ku\.ac\.th$/), 'hostname'), // is KU domain?
    ]),
    URLs)

const maybeCatch = R.tryCatch(fn => Just(fn()), e => Nothing())

const normalize = (raw, base = undefined) =>
  base ? maybeCatch(() => new URL(raw, base))
       : maybeCatch(() => new URL(raw))

const URLextract = R.curry(($, base) =>
  R.tap(URLs =>
    $('a').each(function () {
      normalize($(this).attr('href'), base)
      .map(R.tap(url => (url['hash'] = '', url['search'] = '', url)))
      .map(R.tap(url => URLs.push(url)))
    }), []))

const parserError = cause => () =>
  console.error(`Unable to parse HTML document from "${cause}`)

const parser = res =>
  fromNullable(res.$)
  .map($ => () => ({
    content: { html: $.html(), uri: res.options.uri },
    URLs: URLextract($, res.options.uri)
  }))
  .getOrElse(parserError(res.options.uri))

module.exports = R.curry((scheduler, storage, db, state, pages) =>
  R.pipe(
    R.map(parser),
    R.map(R.call),
    R.filter(R.identity),
    R.map(obj =>
      forkVirtual(URLfilter, contentFilter(storage), false, obj)
      .map(R.flatten)
      .chain(duplicateEliminator(db, obj.content.uri))), // [Future e URLs]
    sequenceF(true)
  )(pages)
  .fork(console.error,
        URLs => scheduler(state, R.flatten(URLs)))) // [Cancel]