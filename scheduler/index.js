// FIXME: [] constrain taking URLs from the queue(by using fixed number)

const _ = require('ramda')
const { Left, Right, Either: { either: fold }, State } = require('../dependencies')
const { lengthM } = require('../utils')

const drop = _.lift((n, s) =>
  _.over(_.lensProp('waiting'), _.drop(n), s))

const lengthOf = _.lift(_.pipe(lengthM, fold(_.always(0), _.identity)))

const onfinished = data => () =>
  console.log(
    '================================================================================\n' +
    '############################## @ CRAWLER ENDED @ ###############################\n' +
    '================================================================================\n' +
    data.join('\n') + '\n' +
    '================================================================================')

const enqueue = q =>
  _.lift(_.over(_.lensProp('waiting'), w => _.concat(w, q)))

module.exports = URLs =>
  State.modify(enqueue(URLs))
  .chain(() =>
    State.gets(_.lift(s =>
      s.limit > 0
        ? Right(_.take(s.limit, s.waiting)) // exponential memory usage!!
        : Left(onfinished([`@in-queue: ${s.waiting.length}`])))))
  .chain(nextURLs =>
    State.modify(drop(lengthOf(nextURLs)))
    .map(() => nextURLs)) // Future e (Either [String log] [String url])

// // test
// const { Future } = require('../dependencies')
// module.exports(['https://ecourse.cpe.ku.ac.th/'])
//   // .exec(Future.of({ limit: 0, waiting: [] }))
//   .eval(Future.of({ limit: 1, waiting: [] }))
//   .fork(console.log, fold(_.call, console.log))