const _ = require('ramda')
const { Future } = require('../dependencies')
const { sequence } = require('../utils')

const restoreResult = _.curry((uriArr, URLsArr) =>
  _.zip(
    _.map(uri => ({ uri }), uriArr),
    _.map(URLs => ({ URLs }), URLsArr))
  .map(([a, b]) => _.merge(a, b)))

const pairFilter = _.curry(_.pipe(_.zip, _.filter(([x, y]) => y), _.map(_.head)))

const hrefs = _.pipe(_.pluck('URLs'), _.map(_.pluck('href')), _.map(_.uniq))

const lookup = _.curry((db, urls) =>
  Future.node(done => db.exists(urls, done)))

module.exports = db =>
  _.chain(pages => // [{ uri, URLs }]
    Future.of({
      check: lookup(db),
      current: _.pluck('uri', pages), // [uri]
      next: hrefs(pages) // [[href]]
    })
    .chain(({ check, current, next }) =>
      check(current)
      .map(() => next.map(check)) // [Future e [Bool]]
      .chain(sequence) // [[Bool]]
      .map(_.zip(next)) // [[[href], [Bool]]]
      .map(_.map(([xs, ys]) => pairFilter(xs, ys.map(_.not)))) // [[href]]
      .map(restoreResult(current)))) // [{ uri, URLs }]