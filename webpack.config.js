const Path = require('path')

module.exports = {
  entry: './frontend/index.js',
  output: {
    filename: 'bundle.js',
    path: Path.resolve(__dirname, 'public')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['env'] }
        }
      }
    ]
  }
}