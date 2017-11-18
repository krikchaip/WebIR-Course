// TODO: [] implement 'chainLift' :: ((a1, a2, ...) -> m b) -> m a1 -> m a2 -> ... -> m b
// TODO: [] implement 'composeM', 'pipeM' :: (a1 -> m a2, a2 -> a3, ..., an -> b) -> a1 -> m b

const _ = require('ramda')
const { Left, Right, Future } = require('./dependencies')

// =================================================================================================
const maybe = nullable =>
  _.isNil(nullable) ? Left(null) : Right(nullable)

const tryCatch = _.tryCatch(_.compose(Right, _.call), Left)

const lengthM = _.map(_.length)

const noop = () => {}

const LR = _.curry((left, right) =>
  ({ left, right }))

const beautifulLog = obj => console.log(JSON.stringify(obj, null, 2))

const branch = _.curry((f, freject, fresolve, cont) =>
  _.chain(shared =>
    Future((reject, resolve) => {
      const fcancel = f(shared).fork(freject, fresolve)
      const contcancel = cont(shared).fork(reject, resolve)
      return _.pipe(fcancel, contcancel)
    })))

const sequenceF = traversable =>
  Future.of(() =>
    traversable
    .forEach(Future.fork(console.error, console.log)))

// =================================================================================================
module.exports = {
  maybe,
  tryCatch,
  lengthM,
  noop,
  LR,
  beautifulLog,
  branch,
  sequenceF
}