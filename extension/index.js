'use strict';

// Get a path that is at the root of the bundle, which for us is one level above
// the extension index, which must always be in a specific location in the
// bundle.
const path = require('path')
const baseDir = path.resolve(__dirname, '..');

// Before doing anything else, load the .env file in the current directory to
// backfill any missing environment variables; anything that is already defined
// will be left untouched.
require('dotenv').config({ path: path.resolve(baseDir, '.env') })

// Load up our configuration information up and obtain the configuration
// object.
const config = require('./config')(baseDir);
const setup_db = require('./db/');
const setup_crypto = require('./crypto/');
const setup_auth = require('./auth/');

// TODO would-be-nice tasks
//   - Wrap the logger so that anything that uses it will send their output to
//     a log panel in the IO
module.exports = async function(nodecg) {
  // Create an API object that will carry the common data and code endpoints
  // that are needed throughout the bot. This makes call signatures smaller and
  // easier to read.
  const api = { nodecg, config, baseDir,
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
  await setup_db(api);

  // Initialize the authorization code; this allows the front end to ask us for
  // auth URL's so that it can authorize on demand, and also sets up the back
  // end service endpoint that Twitch will call back to.
  await setup_auth(api);
};
