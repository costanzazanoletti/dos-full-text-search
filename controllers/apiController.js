const bodyParser = require('body-parser');
const knex = require('./knexController');
const axios = require('axios');
const { searchQuery, searchQueryLocation } = require('./querystring');
const postcodeController = require('./postcodeController');

module.exports = function (app) {
  app.use(bodyParser.json());

  app.get('/api', function (req, res) {
    res.json('this is the api service');
  });

  app.post('/api/seedpostcodes', function (req, res) {
    const start = req.body.start;
    const end = req.body.end;
    postcodeController.seedPostcodes(start, end);
    res.sendStatus(200);
  });

  app.post('/api/search', function (req, res) {
    const term = req.body.searchstring;
    const postcode = req.body.postcode;
    const params = { term: term, postcode: postcode };
    const queryStr =
      postcode && postcode !== '' ? searchQueryLocation : searchQuery;
    knex
      .select('postcode')
      .from('postcode')
      .where('postcode', '=', postcode)
      .then((rows) => {
        if (rows.length == 0) {
          console.log('Postcode not found locally. Call external api');
          axios
            .get(`http://api.postcodes.io/postcodes/${postcode}`)
            .then((response) => {
              let postcodeObj = response.data.result;
              console.log('Found postcode');
              console.log(postcodeObj);
              knex('postcode')
                .insert({
                  postcode: postcodeObj.postcode,
                  in_use: 'Yes',
                  latitude: postcodeObj.latitude.toString(),
                  longitude: postcodeObj.longitude.toString(),
                })
                .then((ir) => {
                  console.log(ir);
                  console.log('Search query');
                  knex.raw(queryStr, params).then((result) => {
                    res.json(result.rows);
                  });
                });
            })
            .catch(function (error) {
              res.sendStatus(500);
            });
        } else {
          console.log('Search query');
          knex.raw(queryStr, params).then((result) => {
            res.json(result.rows);
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.sendStatus(500);
      });
  });
};
