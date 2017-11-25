const _ = require('ramda')
const { Either } = require('ramda-fantasy')
const Future = require('fluture')
const { inspect } = require('util')
const { BigNumber } = require('bignumber.js')
const { Matrix } = require('vectorious')

const arrayLog = arr =>
  console.log(inspect(arr, { breakLength: 0, maxArrayLength: null }))

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
    zeros // result
  ))

const divide = (dvd, dvs, fixed = 15) =>
  Number(new BigNumber(dvd)
        .dividedBy(dvs)
        .toFixed(fixed))

const randomSurferWeight = alpha => matrix =>
  matrix.map(row =>
    row.map(col => (
      a = new BigNumber(alpha),
      ia = a.negated().plus(1),
      newP =
        a.mul(col)
        .plus(ia.mul(divide(1, matrix.length)))
        .toFixed(15),
      Number(newP) // result
    )))

/* mimic from pagerank algorithm(lecture 9, 32) */
const pageRank = iteration => matrix => {
  let A, R, R0, i = 0
  A = new Matrix(_.transpose(matrix))
  R = new Matrix(_.transpose([stochastic(matrix.length)]))

  do { R0 = R; R = A.multiply(R0); }
  while(++i < iteration)

  return R.toArray()
}

const stochastic = n =>
  _.repeat(divide(1, n), n)

// const discreteNorm = matrix =>
//   _.flatten(matrix).reduce((acc, x) =>
//     Math.abs(acc) + Math.abs(x), 0)

readStdinSync
.chain(webgraph)
.map(rowStochastic)
.map(randomSurferWeight(0.85))
.map(pageRank(100))
// .map(_.pipe(_.flatten, _.reduce(_.add, 0)))
.fork(console.error, arrayLog)