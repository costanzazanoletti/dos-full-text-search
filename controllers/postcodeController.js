const axios = require('axios');
const parse = require('csv-parse');
const fs = require('fs');
const knex = require('./knexController');
//const postcodesJson = require('../db/postcodes.json');
//const JSONStream = require('JSONStream');

const FILENAME = `new_aa.csv`;

module.exports = {
  getRemotePostcode: async (postcode) => {
    axios.get(`http://api.postcodes.io/postcodes/${postcode}`);
  },
  getLocalPostcode: async (knex, postcode) => {
    knex('postcode').where('postcode', postcode).select('postcode');
  },
  seedPostcodes: async (start, end) => {
    for (let i = start; i < end; i++) {
      let postcodesJson = require(`../db/postcodes/${i}.json`);
      knex
        .raw(knex('postcode_temp').insert(postcodesJson).toString())
        .then(console.log(`Inserted values for file ${i}.json`))
        .catch((error) => {
          console.log(error);
        });
      /* knex('postcode_temp')
        .insert(postcodesJson)
        .then(console.log(`Inserted values for file ${i}.json`))
        .catch((error) => {
          console.log(error);
        }); */
    }
  },
};
