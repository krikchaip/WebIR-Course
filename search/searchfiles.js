/* FP dependencies */
const _ = require('ramda')
const { Either } = require('ramda-fantasy')

/* Project dependencies */
const lunr = require('lunr')
// console.time('idx&docs loading')
const idx = require('./indexfiles.json')
const docs = require('./documents.json')
// console.timeEnd('idx&docs loading')

/* Global variables */
// console.time('index&documents')
const index = lunr.Index.load(idx)
const documents = docs.map(_.omit(['url', 'edges']))
// console.timeEnd('index&documents')

/* Helper functions */
const tryCatch = _.tryCatch(f => Either.Right(f()), e => Either.Left(e))

// =================================================================================================
const search = (query, s_weight = 1) =>
  tryCatch(() => index.search(query))
  .map(_.map(_.omit(['matchData'])))
  .chain(_.traverse(Either.of, indexCheck))
  .map(_.map(({ ref, score }) =>
    ({ path: documents[ref].path
      ,total_score: pclamp(s_weight) * score +
                    (1 - pclamp(s_weight)) * documents[ref].pr_score
      ,title: documents[ref].title
      ,sample: _.take(200, documents[ref].body) })))
  .map(_.sortBy(_.prop('total_score')))

const indexCheck = ({ ref, score }) =>
  ref == documents[ref].idx
    ? Either.Right({ ref, score })
    : Either.Left(`ERROR_DOCUMENT_INDEX_MISMATCH`)

const pclamp = _.clamp(0, 1)

// search('KU')
// .either(console.error, console.log)

module.exports = search