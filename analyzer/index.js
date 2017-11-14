const R = require('ramda')
const { Maybe,
        Nothing,
        Just,
        fromNullable,
        Future,
        isFuture,
        URL } = require('../dependencies')

// TODO:
const forkV = R.curry((fst, snd, join, shared) =>
	join
		? Future.both(
			isFuture(fst) ? fst.map(f => f(shared)) : Future.of(fst(shared)),
			isFuture(snd) ? snd.map(s => s(shared)) : Future.of(snd(shared)))
		: Future((e, r) =>
			))

const currentDirectoryNotHTML = cause => () =>
	console.error(`"${cause}": is not directly HTML, download terminated.`)

const filename = R.pipe(
	R.split('/'),
	R.last,
	R.ifElse(R.test(/\.\w+$/), Just, Nothing))

const HTMLpath = raw =>
	Maybe.of(new URL(raw))
	.chain(u =>
		filename(u.pathname)
		.chain(
			R.ifElse(R.test(/\.(htm|html)$/),
			R.always(Just(u)),
			Nothing)))

const contentFilter = R.curry((storage, { content: { html, uri } }) =>
	HTMLpath(uri)
	.map(u =>
		() => storage(({ dir: `./html/${u.hostname}${u.pathname}`, html })))
	.getOrElse(currentDirectoryNotHTML(uri))())

const URLfilter = ({ urls }) =>
	R.filter(
		R.allPass([
			R.propSatisfies(R.test(/^http(s)?:/), 'protocol'), // is http/https protocol?
			R.propSatisfies(R.test(/ku\.ac\.th$/), 'hostname'), // is KU domain?
		]),
		urls)

const maybeCatch = R.tryCatch(fn => Just(fn()), e => Nothing())

const normalize = (raw, base = undefined) =>
	base ? maybeCatch(() => new URL(raw, base))
			 : maybeCatch(() => new URL(raw))

const URLextract = R.curry(($, base) =>
	R.tap(urls =>
		$('a').each(function () {
			normalize($(this).attr('href'), base)
			.map(R.tap(url => (url['hash'] = '', url['search'] = '', url)))
			.map(R.tap(url => urls.push(url)))
		}), []))

const parser = res =>
	fromNullable(res.$)
	.map($ => ({
		content: { html: $.html(), uri: res.options.uri },
		urls: URLextract($, res.options.uri)
	}))

module.exports = R.curry((scheduler, storage, res) =>
	parser(res)
		.map(shared =>
			forkV(URLfilter, contentFilter(storage), false, shared)
			.fork(console.error, console.log)))
			// ))
