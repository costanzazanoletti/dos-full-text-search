// dotenv is a npm package which reads variables from a config .env file
require('dotenv').config();
var port = process.env.PORT || 3000;

const express = require('express');
const apiController = require('./controllers/apiController');

const app = express();

apiController(app);

app.listen(port, () => {
  console.log('Server is listening on port ' + port);
});
