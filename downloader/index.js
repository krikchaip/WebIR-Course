const R = require('ramda')
const { Identity,
        Future,
        Nothing,
        Just,
        fromNullable } = require('../dependencies')

const limitSub = R.curry((n, s) =>
  R.over(R.lensProp('limit'), l => l - n, s))

const statusCode2xx = R.filter(res =>
  fromNullable(res.statusCode)
  .map(R.test(/^2\d\d$/))
  .getOrElse(false))

const serialize = R.curry((target, opt) =>
  opt.callback = (err, res, done) => {
    // err ? console.error(err) : target.push(res)
    err || target.push(res)
    done()
  })

module.exports = R.curry((analyzer, instance, state, URLs) =>
  Future.of([])
  .chain(shared =>
    Future((reject, resolve) =>
      // (Identity(URLs)
      // .map(R.tap(URLs =>
      //   console.log(`@downloader URLs: ${JSON.stringify(URLs, undefined, 2)}\n`))),
      (Identity(instance)
      .map(() => instance.on('schedule', serialize(shared)))
      .map(() =>
        instance.once('drain', () =>
          (instance.removeAllListeners('schedule'),
          resolve(shared))))
      .map(() => instance.queue(URLs)),
      () => console.error(`error: cancelation not implemented`))
    ))
  .map(statusCode2xx)
  .fork(console.error, ps =>
    analyzer(limitSub(ps.length, state), ps)))