require('dotenv').config();
module.exports = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
  },
});
