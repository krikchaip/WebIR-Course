const _ = require('ramda')
const { Left, Right, Future } = require('./dependencies')

// =================================================================================================
const maybe = nullable =>
  _.isNil(nullable) ? Left(null) : Right(nullable)
  
const lengthM = _.map(_.length)

// =================================================================================================
module.exports = {
  maybe,
  lengthM,
}