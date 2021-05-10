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

const searchQuery = `
select 
o.org_name, 
adr.area, 
b.borough, 
b.project, 
b.clients, 
s.service,
s.process,
s.service_days,
adr.telephone,
adr.email_address,
o.website,
adr.postcode,
b.tag,
c.cat_concat, s.document_vectors,
ts_rank_cd(s.document_vectors, query) as rank
from "Service" s
join "service_cat_concat_view" c on c.service_id = s.id
join "Branch" b on s.branch_id = b.id
join "Organisation" o on b.org_id = o.id
join "Address" adr on adr.branch_id = b.id,
plainto_tsquery(:term) query
WHERE s.document_vectors @@ plainto_tsquery(:term)
order by rank desc;
`;

const searchQueryLocation = `
select
o.org_name, 
adr.area, 
b.borough, 
b.project, 
b.clients, 
s.service,
s.process,
s.service_days,
adr.telephone,
adr.email_address,
o.website,
adr.postcode,
b.tag,
c.cat_concat, 
s.document_vectors,
ts_rank_cd(s.document_vectors, query) as rank,
case when loc.geom is null then 999999999999999
else ST_DistanceSphere(loc.geom, pc.location)
end as distance
from postcode pc,
"Service" s
join service_cat_concat_view c on c.service_id = s.id
join "Branch" b on s.branch_id = b.id
left outer join "Address" adr on b.id = adr.branch_id
left outer join "Location" loc on adr.id = loc.address_id 
join "Organisation" o on b.org_id = o.id, 
plainto_tsquery(:term) query
WHERE s.document_vectors @@ plainto_tsquery(:term)
and pc.postcode = :postcode
order by distance, rank desc;
`;

module.exports = function (app) {
  app.use(bodyParser.json());

  app.get('/api', function (req, res) {
    res.json('this is the api service');
  });

  app.post('/api/search', function (req, res) {
    const term = req.body.searchstring;
    const postcode = req.body.postcode;
    const params = { term: term, postcode: postcode };
    const queryStr =
      postcode && postcode !== '' ? searchQueryLocation : searchQuery;
    console.log(queryStr);
    knex
      .raw(queryStr, params)
      .then((result) => {
        res.json(result.rows);
      })
      .catch((err) => {
        console.log(err);
        throw err;
      });
  });
};
