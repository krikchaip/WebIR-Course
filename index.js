// FIXME: [] เอา page ที่ res.body ไม่เป็น HTML ออกเพราะ cheerio อ่านไม่ได้

// ##### dependencies
const R = require('ramda');
const {  } = require('ramda-fantasy');
const Crawler = require('crawler');
const Seenreq = require('seenreq');
const Urlparse = require('url-parse');

// ##### configurations
const linkDb = new Seenreq();
const crawler = new Crawler();
const seedUrl = 'https://www.cpe.ku.ac.th';

// ##### pointfree functions
const isKuSite = R.pipe(
  R.unary(Urlparse), // prevent side effects
  R.allPass([
    R.propSatisfies(R.complement(R.isEmpty), 'slashes'),
    R.propSatisfies(R.test(/^http(s)?:/), 'protocol'),
    R.propSatisfies(R.test(/ku\.ac\.th$/), 'hostname'),
  ]),
);

// ##### functions (expression style)
// ใช้ R.allPass ไม่ได้ไม่รู้เพราะว่าอะไร?
const passQueueingConditions = url =>
  isKuSite(url) && !linkDb.exists(url);

// ##### application
// !! WARNING: SIDE CAUSES/EFFECTS !!
function callback(err, res, done) {
  console.log('##### @', res.request.uri.href);
  // TODO: refactor ให้ inject $ เข้าไปแทนที่จะแอบเรียก
  const nextLevelUrls = (function(arr) {
    res.$('a').each(function() {
      const candidateUrl = res.$(this).attr('href');

      if(passQueueingConditions(candidateUrl)) {
        arr.push(candidateUrl);
      }
    });

    return arr;
  })([]);
  console.log(nextLevelUrls);
  // TODO: refactor ตรงที่ map เป็น object
  crawler.queue(nextLevelUrls.map( uri => ({ uri, callback }) ));

  done();
}

// TODO: refactor เป็น function
if(!linkDb.exists(seedUrl)) {
  crawler.queue({ uri: seedUrl, callback });
}