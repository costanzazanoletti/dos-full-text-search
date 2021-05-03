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
  'select o.org_name, b.borough, b.clients, s.service, s.document_vectors, ts_rank_cd(s.document_vectors, query) as rank from "Service" s join "Branch" b on s.branch_id = b.id join "Organisation" o on b.org_id = o.id,  plainto_tsquery(:term) query WHERE s.document_vectors @@ plainto_tsquery(:term) order by rank desc;';

module.exports = function (app) {
  app.use(bodyParser.json());

  app.post('/api/search', function (req, res) {
    const params = { term: req.body.searchstring };
    knex
      .raw(searchQuery, params)
      .then((result) => res.json(result.rows))
      .catch((err) => {
        console.log(err);
        throw err;
      });
  });
};
