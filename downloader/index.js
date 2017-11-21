const _ = require('ramda')
const { Future } = require('../dependencies')
const { maybe } = require('../utils')

const statusCode2xxFilter = _.lift(_.filter(res =>
  maybe(res.statusCode)
  .map(_.test(/^2\d\d$/))
  .either(_.F, _.identity)))

const getPages = (inst, URLs) =>
  Future.node(done => {
    const shared = []
    inst.on('schedule', opt => {
      opt.callback = (err, res, done) =>
        (err || shared.push(res), done())
    })
    inst.once('drain', () => {
      inst.removeAllListeners('schedule')
      done(null, shared)
    })
    inst.queue(URLs)
  })

module.exports = _.curry(_.pipe(getPages, statusCode2xxFilter))