const Future = require('fluture')
const walkSync = require('walk-sync')

const getFolderName =
  Future.node(done =>
    done(null, process.argv[2]))
    .chain(argv =>
      argv
        ? Future.of(argv)
        : Future.reject('Please enter folder name.'))

const filePaths = rootFolder =>
  walkSync(rootFolder, { directories: false })
  .map(p => ({
    path: rootFolder + '/' + p,
    url: 'http://' + p
  }))

const objLog = obj =>
  JSON.stringify(obj, null, 2)

getFolderName
.map(filePaths)
.fork(console.error,
      obj => console.log(objLog(obj)))