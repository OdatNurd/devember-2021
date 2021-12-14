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
// back-fill any missing environment variables; anything that is already defined
// will be left untouched.
require('dotenv').config({ path: path.resolve(baseDir, '.env') })

// Load up our configuration information up and obtain the configuration
// object.
const config = require('./config')(baseDir);
const setup_twitch_api = require('./twitch_api');
const setup_crypto = require('./crypto');
const setup_db = require('./db/');
const setup_auth = require('./auth');
const setup_chat = require('./chat');


// =============================================================================


/* The extension needs to export a single function that takes the nodecg API
 * object as a paramter. NodeCG will invoke this function to initialize the
 * back end of the bundle once the bundle is mounted.
 *
 * As such, you could consider this to be the "main" of this back end code
 * because all execution will start here. */
module.exports = async function(nodecg) {
  // The bot is made up of a series of smaller systems, some of which rely on
  // other systems. In order to keep call signatures sane, we create an "API"
  // object to wrap this information.
  //
  // Some items are directly placed in when this is created, and some modules
  // will also add or redact items as needs warrant in their code; see the
  // section below.
  //
  // The usage pattern for the API is to ensure that for any items for which it
  // may not be a given that they're available, that you double check first that
  // they are present.
  //
  // Some systems will also generate event messages to indicate when systems
  // are coming up or going down.
 const api = { nodecg, config, baseDir,
    // Alias the log routines to make our lives better.
    log: nodecg.log
  };

  // Display our current configuration; this will mask out all of the sensitive
  // configuration values but otherwise show how the bot is running.
  api.log.info(`static configuration: ${api.config.toString()}`);

  //-------------------------
  // Subsystem initialization
  //-------------------------
  // This section starts up all of our subsystems one by one, in a specific
  // order since they depend on each other for some functionality.
  //
  // In all cases, it's entirely possible that in setting up the section, the
  // global state in the API object will be modified as well.
  //
  // This includes setting up a variable or removing it, depending on the
  // status of things.
  setup_twitch_api(api);  // api.twitch
  setup_crypto(api);      // api.crypto.encrypt and api.crypto.decrypt
  await setup_db(api);    // api.db
  await setup_chat(api);  // api.botauth, api.channel, api.chat and api.chatlisteners

  // Set up the web endpoints that allow us to authorize and deauthorize
  // accounts for use in the bot.
  //
  // We wait for this to be complete before we proceed because the chat setup
  // function exits above but will not join the bot into the chat until after
  // this method finishes and broadcasts that the appropriate accounts have been
  // authorized (if they were pre-authorized from a prior run).
  await setup_auth(api);
};


// =============================================================================
