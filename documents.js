/* FP dependencies */
const _ = require('ramda')
const { Either } = require('ramda-fantasy')
const Future = require('fluture')

/* Project dependencies */
const fs = require('fs')
const { URL } = require('url')
const walkSync = require('walk-sync')
const cheerio = require('cheerio')
const { Matrix } = require('vectorious')

/* Helper functions */
const fromNullable = _.ifElse(_.isNil, Either.Left, Either.Right)

const tryCatch = _.tryCatch(f => Either.Right(f()), e => Either.Left(e))

const readFile = path =>
  Future.encaseN2(fs.readFile)(path, 'utf8')

const writeFile = Future.encaseN2(fs.writeFile)

const fillSparse = length => at => tofill => {
  let sparse = _.repeat(0, length)
  let fill = () => at.forEach(idx => sparse[idx] = tofill)
  return (fill(), sparse)
}

const stochastic = n => _.repeat(1 / n, n)

const reduceSpaces = _.replace(/\s+/g, ' ')

// =================================================================================================
const getDocumentsFolderPath =
  Future.node(done =>
    done(null, process.argv[2]))
    .chain(argv =>
      _.isNil(argv)
        ? Future.reject(`usage: "node documents [...HTML documents folder path]"`)
        : Future.of(argv))

const filePathWithURL = rootFolder =>
  Future.node(done => {
    const paths = walkSync(rootFolder, { directories: false })
    const docs = paths.map((p, idx) =>
      ({ idx, url: `http://${p}`, path: `${rootFolder}/${p}` }))
    done(null, docs)
  })

const addEdges =
  _.traverse(Future.of
            ,doc =>
              readFile(doc.path)
              .map(cheerio.load)
              .map(findEdges(doc.url))
              .map(_.merge(doc)))

const findEdges = url => $ => {
  const result = []
  $('a').each(function () {
    fromNullable($(this).attr('href'))
    .chain(href => tryCatch(() => new URL(href, url)))
    .map(_.tap(u => (u['hash'] = '', u['search'] = '')))
    .either(() => {}, r => result.push(r.href))
  })
  return { edges: _.uniq(result) }
}

const scopeEdgesToNumber = docs =>
  Future.of(_.pluck('url', docs))
  .map(urls => ({
    edges: sarr =>
      _.intersection(sarr, urls)
      .map(s => _.indexOf(s, urls))
  }))
  .map(scope => docs.map(_.evolve(scope)))

const addPageRank = docs =>
  Future.of(_.pluck('edges', docs))
  .map(rowStochasticTransform)
  .map(randomSurferWeight(0.85))
  .map(pageRank)
  .map(_.map(_.objOf('pr_score')))
  .map(_.zipWith(_.merge, docs))

const rowStochasticTransform = matrix =>
  matrix.map(row =>
    _.isEmpty(row)
      ? stochastic(matrix.length)
      : fillSparse(matrix.length)(row)(1 / row.length))

const randomSurferWeight = alpha => matrix =>
  matrix.map(row =>
    row.map(col =>
      alpha * col + (1 - alpha) * (1 / matrix.length)))

/* mimic from pagerank algorithm(lecture 9, 32) */
const pageRank = matrix => {
  let A, R0, R, gamma, iteration = 0
  A = new Matrix(_.transpose(matrix))
  R = new Matrix(_.transpose([stochastic(matrix.length)]))
  gamma = matrix.length

  do { R0 = R; R = A.multiply(R0); }
  while(++iteration < gamma)

  return _.flatten(R.toArray())
}

// @2nd time: addEdges()
const addSearchFields =
  _.traverse(Future.of
            ,doc =>
              readFile(doc.path)
              .map(cheerio.load)
              .map(getFields)
              .map(_.merge(doc)))

const getFields = $ => ({
  title: reduceSpaces($('title').text()),
  body: reduceSpaces($('body').text())
})

// =================================================================================================
getDocumentsFolderPath
.chain(filePathWithURL)
// .map(_.take(20)) // take n HTML documents
.chain(addEdges)
.chain(scopeEdgesToNumber)
.chain(addPageRank)
.chain(addSearchFields)
// .map(_.take(20)) // process all and take only n samples
// .fork(console.error, console.log)
.chain(docs =>
  writeFile('documents.json', JSON.stringify(docs)))
.fork(console.error
     ,() => console.log('document file created!!!'))