const axios = require('axios');
const parse = require('csv-parse');
const fs = require('fs');
const knex = require('./knexController');

module.exports = {
  // fetch postcode information from external service http://api.postcodes.io
  getRemotePostcode: (postcode) => {
    return axios.get(`http://api.postcodes.io/postcodes/${postcode}`);
  },
  // select postcode from local db
  getLocalPostcode: (postcode) => {
    return knex('postcode').where('postcode', postcode).select('postcode');
  },
  //add new postcode in db
  insertPostcode: (postcodeObj) => {
    return knex('postcode').insert({
      postcode: postcodeObj.postcode,
      in_use: 'Yes',
      latitude: postcodeObj.latitude.toString(),
      longitude: postcodeObj.longitude.toString(),
    });
  },
  /*
    seed postcode table with data from json files
    start and end parameters define the number of 
    files (from [start].json to [end].json)
    about 50 files per request
  */
  seedPostcodes: async (start, end) => {
    for (let i = start; i < end; i++) {
      let postcodesJson = require(`../db/postcodes/${i}.json`);
      knex
        .raw(knex('postcode_temp').insert(postcodesJson).toString())
        .then(console.log(`Inserted values for file ${i}.json`))
        .catch((error) => {
          console.log(error);
        });
    }
    return;
  },
};
