const knex = require('./knexController');

module.exports = {
  // raw query with custom sql and parameters
  rawQuery: (queryStr, params) => {
    return knex.raw(queryStr, params);
  },
};
