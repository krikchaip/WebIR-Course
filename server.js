const BodyParser = require('body-parser')
const server = require('express')()

server.use(BodyParser.urlencoded({ extended: false }))
server.post('/', (req, res) => res.send(req.body))

server.listen(3000, () => console.log(`server listening at port 3000`))