'use strict';

// Before doing anything else, load the .env file in the current directory to
// backfill any missing environment variables; anything that is already defined
// will be left untouched.
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

// Load up our configuration information up and obtain the configuration
// object.
const config = require('./config');
const setup_db = require('./db/');
const setup_crypto = require('./crypto/');
const setup_auth = require('./auth/');

// TODO would-be-nice tasks
//   - Wrap the logger so that anything that uses it will send their output to
//     a log panel in the IO
module.exports = function(nodecg) {
  // Create an API object that will carry the common data and code endpoints
  // that are needed throughout the bot. This makes call signatures smaller and
  // easier to read.
  const api = { nodecg, config,

    // Alias the log routines to make our lives better.
    log: nodecg.log
  };

  // Display our current configuration; this will mask out the sensitive
  // configuration values.
  api.log.info(`configuration is ${api.config.toString()}`);

  // Initialize the crypto and database systems; these need to happen before any
  // other systems as they may need to deserialize data as a part of their
  // startup. The crypto happens first because the database can store encrypted
  // informations.
  //
  // Both of these items directly augment the passed in API structure.
  setup_crypto(api);
  setup_db(api);

  // Initialize the authorization code; this allows the front end to ask us for
  // auth URL's so that it can authorize on demand, and also sets up the back
  // end service endpoint that Twitch will call back to.
  setup_auth(api);
};
