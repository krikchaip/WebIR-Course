const Path = require('path')
const Express = require('express')
const BodyParser = require('body-parser')
const search = require('./search/searchfiles')

const server = Express()

server.use(BodyParser.urlencoded({ extended: false }))
server.use(Express.static(Path.join(__dirname, 'frontend')))
server.get('/', (req, res) => res.sendFile('index.html'))
server.get('/search', (req, res) => (
  result =
    search(req.query.term, req.query.weight)
    .either(() => {}, r => r),
  res.json(result)
))

server.listen(3000, () =>
  console.log(`Success, start browsing at http://localhost:3000`))