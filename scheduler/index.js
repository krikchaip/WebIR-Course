// TODO: [] put MAX_LIMIT in config file

const _ = require('ramda')
const { Left, Right, Future } = require('../dependencies')

const MAX_LIMIT = 100

const finishMsg = data => '\n' +
  '================================================================================\n' +
  '############################## @ CRAWLER ENDED @ ###############################\n' +
  '================================================================================\n' +
  data.join('\n') + '\n' +
  '================================================================================'

const trim = n => n >= MAX_LIMIT ? MAX_LIMIT : n

const $take = _.curry((n, s) => {
  result = _.take(n, s.waiting)
  s.waiting = _.drop(n, s.waiting)
  return Future.of(result)
})

const $enqueue = _.curry((q, s) =>
  (s.waiting = _.concat(s.waiting, q), Future.of(s)))

module.exports = _.curry((state, URLs) =>
  Future.of(state)
  .chain($enqueue(URLs))
  .chain(s => s.limit > 0
    ? $take(trim(s.limit), s).map(Right)
    : Future.of(Left(finishMsg([
        `@in-queue: ${s.waiting.length}`,
        `@total-HTML: ${s.html}`,
      ])))))