const _ = require('ramda')
const { fold, Future, State } = require('../dependencies')
const { maybe, lengthM } = require('../utils')

const limitSub = _.lift((n, s) =>
  _.over(_.lensProp('limit'), l => l - n, s))

const statusCode2xxFilter = _.map(_.filter(res =>
  maybe(res.statusCode)
  .map(_.test(/^2\d\d$/))
  .either(() => false, _.identity)))

const getPages = inst => _.curry((URLsM, sharedM) =>
  URLsM.chain(URLs =>
    sharedM.chain(shared =>
      Future((reject, resolve) => {
        inst.on('schedule', opt => {
          opt.callback = (err, res, done) =>
            (err || shared.push(res), done())
        })
        inst.once('drain', () => {
          inst.removeAllListeners('schedule')
          resolve(shared)
        })
        fold(_.call, xs => inst.queue(xs), URLs)
        return () => console.error(`error: cancelation not implemented`)
      }))))

module.exports = _.curry((instance, URLs) =>
  State.of(Future.of([]))
  .map(getPages(instance)(URLs))
  .map(statusCode2xxFilter)
  .chain(pagesM =>
    State.modify(limitSub(lengthM(pagesM)))
    .map(() => pagesM)))

// // test
// const { Crawler } = require('../dependencies')
// const instance = new Crawler({
//   timeout: 5000, // 5000
//   maxConnections: 10, // 10
//   retries: 0, // 3
//   retryTimeout: 5000, // 10000
//   jQuery: 'cheerio', // 'cheerio'
//   forceUTF8: true // true
// })

// module.exports(instance, Future.of(maybe(['https://ecourse.cpe.ku.ac.th/'])))
//   .eval(Future.of({ limit: 1, waiting: [] }))
//   .fork(console.error, _.forEach(res => console.log(res.body)))
//   // .exec(Future.of({ limit: 1, waiting: [] }))
//   // .fork(console.error, console.log)