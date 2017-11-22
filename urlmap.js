const walkSync = require('walk-sync')
const paths = walkSync('html', { directories: false })

console.log(JSON.stringify(paths, null, 2))