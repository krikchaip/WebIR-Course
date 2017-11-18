const Rf = require('ramda-fantasy')
const Future = require('fluture')
const Crawler = require('crawler')
const Seenreq = require('seenreq')
const FsPath = require('fs-path')
const Url = require('url')

// =================================================================================================
const { Identity, Either, State } = Rf
const { Left, Right } = Either
const { URL } = Url

// =================================================================================================
module.exports = {
  Identity,
  Either,
    Left,
    Right,
  State,
  Future,
  Crawler,
  Seenreq,
  FsPath,
  URL,
}