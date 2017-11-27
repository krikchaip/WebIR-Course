/* FP dependencies */
const _ = require('ramda')
const Future = require('fluture')

/* Project dependencies */
const fs = require('fs')
const docs = require('./documents.json')

// Currently not support for TH+EN languages
const lunr = require('lunr')
lunr.wordcut = require('lunr-languages/wordcut')
require('lunr-languages/lunr.stemmer.support')(lunr)
require('lunr-languages/lunr.th')(lunr)

/* Helper functions */
const writeFile = Future.encaseN2(fs.writeFile)

// =================================================================================================
const createIndex = Future((rej, res) =>
  res(lunr(function () {
    this.use(lunr.th)
    this.ref('idx')
    this.field('title')
    this.field('body')

    this.metadataWhitelist = []

    docs.map(_.pick(['idx', 'title', 'body']))
        .forEach(d => this.add(d))
  })))

// =================================================================================================
createIndex
.chain(index =>
  writeFile('indexfiles.json', JSON.stringify(index)))
.fork(console.error, () => console.log(`indexfiles created!!!`))