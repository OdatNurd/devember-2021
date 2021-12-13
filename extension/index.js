'use strict';

// TODO:
//   - It would be nice if we captured the output to stdout and stdin so that
//     we could see the chat and other output live in the panel. This is
//     currently problematic because the bundle is mounted after some key
//     information we'd like in the logs is made available.

// =============================================================================

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

// =============================================================================

/* The extension needs to export a single function that takes the nodecg API
 * object as a paramter. NodeCG will invoke this function to initialize the
 * back end of the bundle once the bundle is mounted.
 *
 * As such, you could consider this to be the "main" of this back end code. */
module.exports = async function(nodecg) {
  // The bot is made up of a series of smaller systems, some of which rely on
  // other systems. In order to keep call signatures sane, we create an "API"
  // object to wrap this information.
  //
  // Some items are directly placed in when this is created, and some modules
  // will also add or redact items as needs warrant in their code.
  //
  // Thus it is always advised to ensure that the field you want is present.
  const api = { nodecg, config, baseDir,
    // Alias the log routines to make our lives better.
    log: nodecg.log
  };

  // Display our current configuration; this will mask out all of the sensitive
  // configuration values but otherwise show how the bot is running.
  api.log.info(`configuration is ${api.config.toString()}`);

  //-------------------------
  // Subsystem initialization
  //-------------------------
  // This section starts up all of our susbsystems one by one, in a specific
  // order since they depend on each other for some functionality.
  //
  // In all cases, it's entirely possible that in setting up the section, the
  // global state in the API object will be modified as well.
  //
  // This includes setting up a variable and also removing it, based on events.
  setup_crypto(api);      // api.crypto.encrypt and api.crypto.decrypt
  await setup_db(api);    // api.db
  await setup_auth(api);  // api.twitch
};
