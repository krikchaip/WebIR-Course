const _ = require('ramda')
const { Either } = require('ramda-fantasy')
const Future = require('fluture')
const { inspect } = require('util')
const { BigNumber } = require('bignumber.js')

const arrayLog = arr =>
  console.log(inspect(arr, { breakLength: 10000, maxArrayLength: null }))

const fromNullable = _.ifElse(_.isNil, Either.Left, Either.Right)

const tryCatch =
  _.tryCatch(f => Either.Right(f())
            ,e => Either.Left(e))

/* source: https://gist.github.com/kristopherjohnson/5065599 */
const readStdinSync =
  Future.node(done => {
    const inputChunks = []
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => inputChunks.push(chunk))
    process.stdin.on('end', () => done(null, inputChunks.join('')))
  })

const webgraph = str =>
  tryCatch(() => JSON.parse(str))
  .bimap(() => [], _.identity)
  .chain(makeSureIsArray)
  .chain(_.traverse(Either.of, makeSureIsArray))
  .either(Future.reject, Future.of)

const makeSureIsArray = obj =>
  Array.isArray(obj)
    ? Either.Right(obj)
    : Either.Left(`input isn't an array, end computation.`)

const rowStochastic = matrix =>
  matrix.map(row => (
    zeros = _.repeat(0, matrix.length),
    _.isEmpty(row)
      ? zeros.fill(divide(1, matrix.length))
      : row.forEach(n => zeros[n] = divide(1, row.length)),
    zeros // return mutated result
  ))

const divide = (dvd, dvs, fixed = 15) =>
  Number(new BigNumber(dvd)
        .dividedBy(dvs)
        .toNumber()
        .toFixed(fixed))

readStdinSync
.chain(webgraph)
// .map(_.take(100))
.map(rowStochastic)
.fork(console.error, arrayLog)