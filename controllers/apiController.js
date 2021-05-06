require('dotenv').config();
const bodyParser = require('body-parser');

const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
  },
});

const searchQuery =
  'select ad.postcode, o.org_name, b.borough, b.clients, s.service, cc.cat_concat, s.document_vectors, ' +
  'ts_rank_cd(s.document_vectors, query) as rank ' +
  'from "Service" s ' +
  'join "service_cat_concat_view" cc on cc.service_id = s.id ' +
  'join "Branch" b on s.branch_id = b.id ' +
  'left outer join "Address" ad on b.id = ad.branch_id ' +
  'join "Organisation" o on b.org_id = o.id, ' +
  'plainto_tsquery(:term) query ' +
  'WHERE s.document_vectors @@ plainto_tsquery(:term) ' +
  'order by rank desc;';
const searchQueryLocation =
  'select ad.postcode, o.org_name, b.borough, b.clients, ' +
  's.service, cc.cat_concat, s.document_vectors, ' +
  'ts_rank_cd(s.document_vectors, query) as rank, ' +
  'case when loc.geom is null then 999999999999999 ' +
  'else ST_DistanceSphere(loc.geom, pc.location) ' +
  'end as distance ' +
  'from postcode pc, ' +
  '"Service" s ' +
  'join service_cat_concat_view cc on cc.service_id = s.id ' +
  'join "Branch" b on s.branch_id = b.id ' +
  'left outer join "Address" ad on b.id = ad.branch_id ' +
  'left outer join "Location" loc on ad.id = loc.address_id ' +
  'join "Organisation" o on b.org_id = o.id, ' +
  'plainto_tsquery(:term) query ' +
  'WHERE s.document_vectors @@ plainto_tsquery(:term) ' +
  'and pc.postcode in (:postcode) ' +
  'order by distance, rank desc;';

module.exports = function (app) {
  app.use(bodyParser.json());

  app.post('/api/search', function (req, res) {
    const term = req.body.searchstring;
    const postcode = req.body.postcode;
    const params = { term: term, postcode: postcode };
    const queryStr =
      postcode && postcode !== '' ? searchQueryLocation : searchQuery;
    // console.log(queryStr);
    knex
      .raw(queryStr, params)
      .then((result) => res.json(result.rows))
      .catch((err) => {
        console.log(err);
        throw err;
      });
  });
};
