const bodyParser = require('body-parser');
const { searchQuery, searchQueryLocation } = require('./querystring');
const {
  getLocalPostcode,
  getRemotePostcode,
  seedPostcodes,
  insertPostcode,
} = require('./postcodeController');
const { rawQuery } = require('./queryController');

module.exports = function (app) {
  app.use(bodyParser.json());

  // check api status
  app.get('/api', function (req, res) {
    res.json('this is the api service');
  });

  /* seed postcode table: must be called several times
  incrementing start and end parameters 
  (0-50, 50-100, 100-150, 150-200, 200-263)
  */
  app.post('/api/seedpostcodes', function (req, res) {
    const start = req.body.start;
    const end = req.body.end;
    seedPostcodes(start, end);
    res.sendStatus(200);
  });

  // search by keywords
  app.post('/api/search', function (req, res) {
    const term = req.body.searchstring;
    const postcode = req.body.postcode;
    const params = { term: term, postcode: postcode };
    const queryStr =
      postcode && postcode !== '' ? searchQueryLocation : searchQuery;
    try {
      // check if postcode is in db
      getLocalPostcode(postcode).then((rows) => {
        if (rows.length == 0) {
          //if postcode is not in db get it from external api
          getRemotePostcode(postcode).then((response) => {
            let postcodeObj = response.data.result;
            // add postcode to db
            insertPostcode(postcodeObj).then((ir) => {
              // perform search query
              rawQuery(queryStr, params).then((result) => {
                res.json(result.rows);
              });
            });
          });
        } else {
          // perform search query
          rawQuery(queryStr, params).then((result) => {
            res.json(result.rows);
          });
        }
      });
    } catch (err) {
      //console.log(err);
      res.sendStatus(500);
    }
  });
};
