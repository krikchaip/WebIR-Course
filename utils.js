// TODO: [] implement 'chainLift' :: ((a1, a2, ...) -> m b) -> m a1 -> m a2 -> ... -> m b
// TODO: [] implement 'composeM', 'pipeM' :: (a1 -> a2, a2 -> a3, ..., an -> b) -> m a1 -> m b

const _ = require('ramda')
const { Left, Right, Future } = require('./dependencies')

// =================================================================================================
const maybe = nullable =>
  _.isNil(nullable) ? Left(null) : Right(nullable)

const tryCatch = _.tryCatch(_.compose(Right, _.call), Left)

const lengthM = _.map(_.length)

const noop = () => {}

const branchResult = _.curry((left, right) =>
  ({ left, right }))

const beautifulLog = obj => console.log(JSON.stringify(obj, null, 2))

// =================================================================================================
module.exports = {
  maybe,
  tryCatch,
  lengthM,
  noop,
  branchResult,
  beautifulLog
}