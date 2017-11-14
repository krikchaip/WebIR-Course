const Rf = require('ramda-fantasy')
const Future = require('fluture')
const Crawler = require('crawler')
const Seenreq = require('seenreq')
const FsPath = require('fs-path')
const Url = require('url')

// =================================================================================================
const { Identity, IO, Maybe } = Rf
const { Nothing, Just, toMaybe: fromNullable } = Maybe
const { isFuture } = Future

// =================================================================================================
module.exports = {
  Identity,
  IO,
  Maybe,
    Nothing,
    Just,
    fromNullable,
  Future,
    isFuture,
  Crawler,
  Seenreq,
  FsPath,
  URL: Url.URL,
}