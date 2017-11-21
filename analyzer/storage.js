const _ = require('ramda')
const { Either: { either: fold, isRight },
        Future,
        FsPath } = require('../dependencies')
const { noop, sequence } = require('../utils')

const writeFile = Future.encaseN2(FsPath.writeFile)

const fillUpSlash = dir =>
  _.last(dir) === '/' ? dir : dir + '/'

module.exports = folderPath =>
  _.pipe(
    _.filter(isRight),
    _.map(fold(
      noop,
      ({ dir, html }) =>
        writeFile(fillUpSlash(folderPath) + dir, html)
        .map(() => `@HTML: "${dir}" written`))),
    sequence)