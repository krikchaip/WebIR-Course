// TODO: [] put exclusions in config file

const _ = require('ramda')
const { Future } = require('../dependencies')
const { branch, noop, objStr } = require('../utils')

const parser = require('./parser')
const filter = require('./pagefilter')
const storage = require('./storage')
const eliminator = require('./eliminator')

const exclusions = [
  'pdf', 'doc', 'docx', 'jpg', 'rar',
  'xls', 'xlsx', 'png', 'ppt', 'pptx',
  'zip', 'dotx', 'exe', 'rtf', 'mp3',
  'mov', 'ppsx', 'gif', 'wmv',
]

const $summary = state =>
  _.chain(objs => {
    state.limit -= objs.length
    objs.forEach(obj =>
      console.log(`@response: ${++state.counter} ${objStr(obj.uri)}`))
    return Future.of(_.pipe(_.pluck('URLs'), _.flatten)(objs))
  })

module.exports = _.curry((db, state) =>
  _.pipe(
    parser,
    branch(
      _.pipe(filter.$content(state), _.chain(storage('./html'))),
      console.error,
      _.forEach(console.log),
      filter.url(exclusions)),
    eliminator(db),
    $summary(state)))