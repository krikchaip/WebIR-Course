// Currently not support for TH+EN languages
const lunr = require('lunr')
lunr.wordcut = require('lunr-languages/wordcut')
require('lunr-languages/lunr.stemmer.support')(lunr)
require('lunr-languages/lunr.th')(lunr)

// const _ = require('ramda')
// const {} = require('ramda-fantasy')
// const Future = require('fluture')

// const index = lunr(function () {
//   this.use(lunr.th)
// })