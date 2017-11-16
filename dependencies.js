const Rf = require('ramda-fantasy')
const Future = require('fluture')
const Crawler = require('crawler')
const Seenreq = require('seenreq')
const FsPath = require('fs-path')
const Url = require('url')

// =================================================================================================
const { Either, State } = Rf
const { Left, Right, either: fold } = Either
const { URL } = Url

// =================================================================================================
module.exports = {
  Either,
    Left,
    Right,
    fold,
  State,
  Future,
  Crawler,
  Seenreq,
  FsPath,
  URL,
}