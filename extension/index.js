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

// These represent the setup mechanisms for the different aspects of the bot
// runtime; these are all called when the extension is first loaded.
const setup_twitch_api = require('./twitch_api');
const setup_crypto = require('./crypto');
const setup_db = require('./db/');
const { setup_auth } = require('./auth');
const setup_chat = require('./chat');

const { CommandParser } = require('./core/');


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
    log: nodecg.log,

    // The role that this bot has; this can be things like dev, prod, test
    // and so on. This groups installations of the bot that might all be
    // running in the same channel at the same time.
    role: config.get('bot.role'),

    // If an incoming bot command doesn't include a role=rolename argument,
    // the value of this key (if any) is used instead. This allows a single
    // command to "switch" which bot the commands are addressed to without
    // having to specify the parameter each time.
    //
    // Undefined means there is no default role (and thus the command will
    // be executed).
    defaultCmdRole: undefined,

    // The API contains a function that allows anyone to look up the effective
    // userlevel of a user based on a UserInfo record. This is primarily used
    // by commands to determine if they can be executed or not, but other items
    // may want to use this as well, say to customize events based on the user
    // that triggered them.
    getUserLevel: (api, userInfo) => {
      /* eslint-disable curly */
      if (userInfo.isBroadcaster) return 0;
      if (userInfo.isMod) return 1;
      if (userInfo.isVip) return 2;

      // TODO: It would be nice if this was a thing that worked.
      // if (api.shared.regulars !== undefined && api.shared.regulars.has(userInfo.userId)) return 3;
      if (userInfo.isSubscriber) return 4;
      /* eslint-enable curly */

      // The fallback is an access level that associated with everyone
      return 5;
    },

    // The command parser that we use to handle incoming commands,
    cmdParser: new CommandParser()
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
  await setup_chat(api);  // under api.chat: auth, channel, client, say and listeners

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
