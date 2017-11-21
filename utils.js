// TODO: [] implement 'chainLift' :: ((a1, a2, ...) -> m b) -> m a1 -> m a2 -> ... -> m b
//          (map() every arguments and chain() on the last)
// TODO: [] implement 'composeM', 'pipeM' :: (a1 -> m a2, a2 -> a3, ..., an -> b) -> a1 -> m b

const _ = require('ramda')
const { Left, Right, Future } = require('./dependencies')

// =================================================================================================
const maybe = nullable =>
  _.isNil(nullable) ? Left(null) : Right(nullable)

const tryCatch = _.tryCatch(_.compose(Right, _.call), Left)

const noop = () => {}

const LR = _.curry((left, right) =>
  ({ left, right }))

const objStr = obj => JSON.stringify(obj, null, 2)

const branch = _.curry((f, freject, fresolve, cont, shared) =>
  Future((reject, resolve) => {
    const fcancel = f(shared).fork(freject, fresolve)
    const contcancel = cont(shared).fork(reject, resolve)
    return _.pipe(fcancel, contcancel)
  }))

const sequence = _.reduce((acc, M) => {
  return M.chain(x => acc.map(ys => ys.concat([x])))
}, Future.of([]))

// =================================================================================================
module.exports = {
  maybe,
  tryCatch,
  noop,
  LR,
  objStr,
  branch,
  sequence
}