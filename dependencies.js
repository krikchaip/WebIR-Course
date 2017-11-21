const Rf = require('ramda-fantasy')
const Future = require('fluture')
const Crawler = require('crawler')
const FsPath = require('fs-path')
const Url = require('url')
const Crypto = require('crypto')

// =================================================================================================
const { Identity, Either, State } = Rf
const { Left, Right } = Either
const { URL } = Url

class SimpleDb {
  constructor() {
    this.cache = Object.create(null);
  }
  hash(str) {
    return Crypto.createHash('md5').update(str).digest('hex');
  }
  exists(xs, cb) {
    let result, cache = this.cache, hash = this.hash;
    if(!Array.isArray(xs)) {
      let key = hash(xs);
      if(key in cache) cb(null, true);
      else { cache[key] = null; cb(null, false); }
    } else {
      let ans = xs.map(x => {
        let key = hash(x);
        if(key in cache) return true;
        else { cache[key] = null; return false; }
      });
      cb(null, ans);
    }
  }
}

// =================================================================================================
module.exports = {
  Identity,
  Either,
    Left,
    Right,
  State,
  Future,
  Crawler,
  FsPath,
  URL,
  SimpleDb
}