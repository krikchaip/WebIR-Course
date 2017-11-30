import _ from 'ramda'
import Future from 'fluture'
import $ from 'jquery'

const fetchJSONwithQuery =
  Future.encaseP2((dest, query) =>
    fetch(`${dest}?${query}`)
    .then(res => res.json()))

const toHTMLstring = json =>
  json.map(obj =>
    searchResult(obj.url, obj.title, obj.sample))
  .join('')

const searchResult = (url, title = 'NO_TITLE_FOUND', sample = 'NO_SAMPLE_FOUND') =>
  `<div class="search-result">
    <h3><a href="${url}">${title}</a></h3>
    <div class="ref">${url}</div>
    <div>${sample}...</div>
  </div>`

// FIXME: ความจริง refactor ให้มันเป็น functional ได้มากกว่านี้แต่พอแค่นี้เถอะ
$('form').submit(function () {
  fetchJSONwithQuery('/search', $(this).serialize())
  .map(toHTMLstring)
  .chain(str => $('#results').html(str))
  .fork(console.error, () => {})
  return false // to prevent from actual submission
})