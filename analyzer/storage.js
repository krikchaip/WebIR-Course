const _ = require('ramda')
const { Either: { either: fold, isRight },
        Right,
        Future,
        FsPath } = require('../dependencies')
const { noop, sequenceF } = require('../utils')

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
        .map(() => `${dir} written`))),
    sequenceF)

// // test
// const content = [Right({ dir: 'win.yedd/test.html', html: `<div></div>` })]
// module.exports('./html2')(content).value(_.call)