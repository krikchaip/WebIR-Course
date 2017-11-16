const _ = require('ramda')
const { Left, Right, State, fold } = require('../dependencies')
const { lengthM } = require('../utils')

const onfinished = data => () =>
  console.log(
    '================================================================================\n' +
    '############################## @ CRAWLER ENDED @ ###############################\n' +
    '================================================================================\n' +
    data.join('\n') + '\n' +
    '================================================================================')

const lengthOf = _.lift(_.pipe(lengthM, fold(_.always(0), _.identity)))

const drop = _.lift((n, s) =>
  _.over(_.lensProp('waiting'), _.drop(n), s))

const enqueue = q =>
  _.lift(_.over(_.lensProp('waiting'), w => _.concat(w, q)))

module.exports = URLs =>
  State.modify(enqueue(URLs))
  .chain(() =>
    State.gets(_.lift(s =>
      s.limit > 0
        ? Right(_.take(s.limit, s.waiting))
        : Left(onfinished([`@in-queue: ${s.waiting.length}`])))))
  .chain(nextURLs =>
    State.modify(drop(lengthOf(nextURLs)))
    .map(() => nextURLs)) // Future e (Either Logs URLs)
    // State.get.chain(s =>
    //   s.limit > 0
    //     ? State.modify(drop(s.limit))
    //       .map(() => Right(_.take(s.limit, s.waiting)))
    //     : State.of([])
    //       .map(_.append(`@in-queue: ${s.waiting.length}`))
    //       .map(_.compose(Left, onfinished))))

// // test
// const { Future } = require('../dependencies')
// module.exports(['https://ecourse.cpe.ku.ac.th/'])
//   // .exec(Future.of({ limit: 0, waiting: [] }))
//   .eval(Future.of({ limit: 1, waiting: [] }))
//   .fork(console.log, fold(_.call, console.log))