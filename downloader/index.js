const R = require('ramda')
const { IO, Nothing, Just, fromNullable } = require('../dependencies')

const statusCodeNot2xx = (cause, detail) => () =>
  console.error(`"${cause}": (${detail}), status code failed`)

const onsuccess = R.curry((cb, res) =>
  fromNullable(res.statusCode)
  .map(R.test(/^2\d\d$/))
  .chain(s => s ? Just(() => cb(res)) : Nothing())
  .getOrElse(statusCodeNot2xx(res.options.uri, res.statusCode))())

const addCb = R.curry((fn, opt) =>
  opt.callback = (err, res, done) =>
    (err ? console.error(err)
         : onsuccess(fn, res)
    , done()))

const listen = R.curry((ev, fn, inst) => IO(() => inst.on(ev, fn)))

module.exports = R.curry((analyzer, instance, URLs) =>
  listen('schedule', addCb(analyzer), instance)
  .chain(() => IO(() => instance.queue(URLs))))