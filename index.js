/* Dependencies */
const Crawler = require('crawler');
const URL = require('url-parse');
const SeenReq = require('seenreq');
const fs = require('fs');
const R = require('ramda');
const {  } = require('ramda-fantasy');

/* Configurations */
const seed = 'https://www.cpe.ku.ac.th';
const seen = new SeenReq();
const crawler = new Crawler({
  maxConnections: 10,
  retries: 3,
  retryTimeout: 10000,
  timeout: 10000,
  jQuery: 'cheerio',
});

// !!! ทำให้เสร็จก่อนแล้วค่อย Refactor ทีหลัง !!!
// [] search until found .htm/.html page then download it
// [] looking for robots.txt at root path
// [] limit to ku.ac.th domain scope

async function traverse(seed, limit) {
  const state = { limit };
  const { newLinks: raw, newState } = await crawl(seed, state);

  peek(newState);
  peek(raw);

  return newState.limit > 0 ? traverse(raw, newState.limit) : peek('finished!');
}

// ## WARNING: SIDE CAUSES/EFFECTS ##
function crawl(links, state = { limit: 10 }) {
  return new Promise((resolve, reject) => {

    function callback(err, res, done) {
      const { $ } = res;
      const newLinks = R.drop(1)(links);
      const newState = R.assoc('limit', state.limit - 1)(state);

      $('a').each(function() {
        newLinks.push($(this).attr('href'));
      });

      if(!err) { resolve({ newLinks, newState }); }
      else { reject(err); }

      return done();
    }

    const tasks = R.pipe(
      R.map(URL),
      R.filter(onlyKUsites),
      R.map(R.invoker(0, 'toString')),
      R.map(R.objOf('uri')),
      R.map(R.assoc('callback', callback)),
      peek
    );

    // peek(state);

    // TODO: ทำให้ใส่ queue ได้ทีละ N
    crawler.queue( R.head(tasks(links)) );

  });
}

// ## WARNING: SIDE CAUSES/EFFECTS ##
function peek(item) {
  console.log(item);
  return item;
}

function onlyKUsites(link) {
  return link.slashes
    && R.test(/^http(s)?:/, link.protocol)
    && R.test(new RegExp(`ku.ac.th$`), link.hostname)
}

/* Start application */
traverse([ seed ], 1);