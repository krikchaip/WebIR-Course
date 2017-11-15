const R = require('ramda')
const { Future, FsPath } = require('../dependencies')

const writeFile = Future.encaseN2(FsPath.writeFile)

module.exports = ({ dir, html }) => writeFile(dir, html)