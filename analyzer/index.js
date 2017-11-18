// TODO: [] log each loaded page(do it like you did on scheduler)
// TODO: [x] excludes other filename extensions than HTML
// TODO: [] separate into sub-modules
// TODO: [] put exclusions in config file

const _ = require('ramda')
const { State } = require('../dependencies')
const { branch, noop } = require('../utils')

const exclusions = [
  'pdf', 'doc', 'docx', 'jpg', 'rar',
  'xls', 'xlsx', 'png', 'ppt', 'pptx',
  'zip', 'dotx', 'exe', 'rtf'
]

const parser = require('./parser')
const filter = require('./pagefilter')
const storage = require('./storage')
// const eliminator =

const saveContent = _.pipe(filter.content, _.chain(storage('./html2')))
const continueWith = branch(saveContent, noop, _.call)

module.exports = _.curry((db, pagesM) =>
  State.of(pagesM) // Future e [res]
  .map(parser) // Future e [{ left: [URL], right: { uri, html } }]
  .map(continueWith(filter.url(exclusions))) // Future e [[URL]]
  )