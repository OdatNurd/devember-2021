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
const setup_file_server = require('./file_api');
const { setup_auth } = require('./auth');
const setup_twitch_eventsub = require('./eventsub');
const setup_chat = require('./chat');
const setup_tts = require('./google_tts');
const bootstrap_core_data = require('./bootstrap');


const { CommandParser, CodeHandlerMap, StaticHandlerMap,
        BotCommand, BotEvent, TextResponder } = require('./core/');


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

    // This value controls wether or not the bot's chat connection will generate
    // debug information in the logs for messages as they arrive. A value of 0
    // indicates that nothing will be logged, while a non-zero value is an
    // indication that logging should be done.
    debugMsgs: 0,

    // When message debugging is turned on above, this list controls the users
    // whose incoming messages should be logged. If the list is empty, then
    // every user's messages will be debug logged; otherwise, only those that
    // appear in this list will be logged.
    debugMsgsFrom: [],

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
      if (api.shared.regulars !== undefined && api.shared.regulars.has(userInfo.userId)) return 3;
      if (userInfo.isSubscriber) return 4;
      /* eslint-enable curly */

      // The fallback is an access level that associated with everyone
      return 5;
    },

    // This shared storage area can be used by any part of the bot internals to
    // store information that might need to be persisted between command
    // invocations, events, channel redemptions or even shared betwen them.
    //
    // Generally speaking, any such storage should be initialized on load and
    // cleaned up on unload, but this is not enforced and so it's possible to
    // use this to perist information across file reloads as well.
    //
    // This data is not persisted between bot invocations. It's also up to the
    // code using this shared area to use a responsible namespace and not
    // clobber things.
    shared: {},

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
  setup_twitch_api(api);  // api.twitch (and api.twitchUser after user Auth)
  setup_crypto(api);      // api.crypto.encrypt and api.crypto.decrypt
  await setup_db(api);    // api.db

  // Now that the base core is set up, bootstrap any data in the database that
  // needs to be present.
  await bootstrap_core_data(api);

  // Set up the Twitch EventSub mechanism that will deliver channel events to us
  // as they occur.
  await setup_twitch_eventsub(api); // under api.eventSub: listener uri, port, secret

  // We can now set up chat, which will take care of joining the bot to the chat
  // if it has the correct authorizations already, or the events that will cause
  // it to join when it does.
  await setup_chat(api);  // under api.chat: auth, channel, client, say and listeners

  // Set up the web endpoints that allow us to authorize and deauthorize
  // accounts for use in the bot.
  //
  // We wait for this to be complete before we proceed because the chat setup
  // function exits above but will not join the bot into the chat until after
  // this method finishes and broadcasts that the appropriate accounts have been
  // authorized (if they were pre-authorized from a prior run).
  await setup_auth(api);

  // Set up the Text to Speech system; this provides an endpoint that we can
  // use to cause the bot to speak text in a variety of different voices and
  // languages.
  setup_tts(api);

  // Set up the routes that allow for the front end to query and save the
  // contents of files for online editing.
  await setup_file_server(api);

  // Create a code handler that associates the commands and events in the
  // database with the classes that know how to execute them as appropriate.
  //
  // The arguments to the handler tell it what database it needs to pull data
  // from and how to wrap each entry in an appropriate class.
  //
  // This is in the API so that all code in the bot can access them as needed.
  api.commands = new CodeHandlerMap(api, 'commands', data => new BotCommand(data));
  api.events = new CodeHandlerMap(api, 'events', data => new BotEvent(data));

  // The above code creates the handler maps that are required, but in order to
  // make the code available we need to tell them to initialize themselves, which
  // will get them to pull from the database and load the appropriate files.
  //
  // This can return a list of errors that indicate issues; capture the initial
  // log result and store it.
  const cmdResult = await api.commands.initialize();
  const initialCmdLog = cmdResult.length === 0
                            ? 'All commands loaded successfuly'
                            : cmdResult.map(err => `${err}\n${err.stack}`).join("\n");

  const evtResult = await api.events.initialize();
  const initialEvtLog = evtResult.length === 0
                            ? 'All events loaded successfuly'
                            : evtResult.map(err => `${err}\n${err.stack}`).join("\n");

  // Create a static handler that associates the text responders in the database
  // with available responders that can be triggered at runtime.
  //
  // This is similar to commands, but here the items have a single, static
  // handler function and only need the text from the entries in order to
  // trigger.
  api.responders = new StaticHandlerMap(api, 'responders', data => new TextResponder(data));
  api.responders.initialize();

  // When requested by the front end, send the initial logs to them.
  api.nodecg.listenFor('get-initial-cmd-log', () => api.nodecg.sendMessage('set-cmd-log', initialCmdLog));
  api.nodecg.listenFor('get-initial-evt-log', () => api.nodecg.sendMessage('set-evt-log', initialEvtLog));
};


// =============================================================================
