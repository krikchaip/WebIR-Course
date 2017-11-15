const R = require('ramda')
const { Identity } = require('../dependencies')

const onfinished = data => () =>
  console.log(
    '================================================================================\n' +
    '############################## @ CRAWLER ENDED @ ###############################\n' +
    '================================================================================\n' +
    data.join('\n') + '\n' +
    '================================================================================')

const drop = n =>
  R.over(R.lensProp('waiting'), R.drop(n))

const enqueue = q =>
  R.over(R.lensProp('waiting'), w => R.concat(w, q))

module.exports = R.curry((downloader, state, URLs) =>
  Identity(state)
  .map(enqueue(URLs))
  .map(R.tap(state =>
    console.log(`@scheduler state.limit: ${JSON.stringify(state.limit, undefined, 2)}`)))
  .map(R.tap(state =>
    console.log(`@scheduler state.waiting.length: ${JSON.stringify(state.waiting.length, undefined, 2)}`)))
  .chain(s =>
    s.limit > 0
      ? Identity(s)
        .map(drop(s.limit))
        .chain(newS =>
          Identity(() =>
            downloader(newS, R.take(s.limit, s.waiting))))
      : Identity([])
        .map(R.append(`@in-queue: ${s.waiting.length}`))
        .map(onfinished))
  .get()())