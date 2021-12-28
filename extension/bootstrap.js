// =============================================================================


const { dedent:_ } = require('./utils');


// =============================================================================


/* This is the list of core commands that ship with the bot and make up the
 * basis for the core functionality (hence the name). These are expected to
 * always exist, and so the bootstrap needs to make sure that they exist
 * in the database at startup if they're not already there. */
const commands = [
  {
      name: "$debug",
      aliases: ["$dbg"],
      enabled: 1,
      sourceFile: "command/debug.js",
      core: 1,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$reload",
      aliases: ["$rehash"],
      enabled: 1,
      sourceFile: "command/reload.js",
      core: 1,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$addcommand",
      aliases: ["$addcmd"],
      enabled: 1,
      sourceFile: "command/cmd_controller.js",
      core: 1,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$removecommand",
      aliases: ["$delcmd", "$rmcmd"],
      enabled: 1,
      sourceFile: "command/cmd_controller.js",
      core: 1,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$enable",
      aliases: ["$disable"],
      enabled: 1,
      sourceFile: "command/cmd_controller.js",
      core: 1,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$accesslevel",
      aliases: ["$access"],
      enabled: 1,
      sourceFile: "command/cmd_controller.js",
      core: 1,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },  {
      name: "$cooldown",
      aliases: [],
      enabled: 1,
      sourceFile: "command/cmd_controller.js",
      core: 1,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },  {
      name: "$alias",
      aliases: ["$aliases"],
      enabled: 1,
      sourceFile: "command/cmd_controller.js",
      core: 1,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },  {
      name: "$cmdinfo",
      aliases: ["$info"],
      enabled: 1,
      sourceFile: "command/cmd_controller.js",
      core: 1,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },
  {
      name: "$role",
      aliases: [],
      enabled: 1,
      sourceFile: "command/role.js",
      core: 1,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$regulars",
      aliases: ["$regular", "$regs"],
      enabled: 1,
      sourceFile: "command/regulars.js",
      core: 1,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },
  {
      name: "$text",
      aliases: [],
      enabled: 1,
      sourceFile: "command/text.js",
      core: 1,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },


  // ==================================================
  // Commands below here are "regular" commands and not
  // core commands; they're included here because they
  // are included in the bot code and we need to
  // bootstrap them if the database does not include
  // them.
  // ==================================================

  {
      name: "$shoutout",
      aliases: ["$so"],
      enabled: 1,
      sourceFile: "command/shoutout.js",
      core: 0,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },
  {
      name: "$tts",
      aliases: ["$say"],
      enabled: 1,
      sourceFile: "command/tts_speak.js",
      core: 0,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },

  {
      name: "$drop",
      aliases: [],
      enabled: 1,
      sourceFile: "command/drop_game.js",
      core: 0,
      hidden: 0,
      userLevel: 5,
      cooldown: 0
  },
  {
      name: "$cut",
      aliases: [],
      enabled: 1,
      sourceFile: "command/drop_game.js",
      core: 0,
      hidden: 0,
      userLevel: 5,
      cooldown: 0
  },
  {
      name: "$abdicate",
      aliases: [],
      enabled: 1,
      sourceFile: "command/drop_game.js",
      core: 0,
      hidden: 0,
      userLevel: 5,
      cooldown: 0
  },
  {
      name: "$bdrop",
      aliases: [],
      enabled: 1,
      sourceFile: "command/drop_game.js",
      core: 0,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$bcut",
      aliases: [],
      enabled: 1,
      sourceFile: "command/drop_game.js",
      core: 0,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$babdicate",
      aliases: [],
      enabled: 1,
      sourceFile: "command/drop_game.js",
      core: 0,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
];

/* This is the list of core events that ship with the bot and make up the whole
 * of the event system. Although events are based on the same dynamic system
 * as commands and can be hot reloaded and dynamically added and removed at
 * runtime, the actual list of events is fixed and as such, this just provides
 * the total list of all known events. */
const events = [
  {
      name: "moderator_add",
      aliases: ["moderator_remove"],
      enabled: 1,
      sourceFile: "event/moderate.js",
  },  {
      name: "ban",
      aliases: ["unban"],
      enabled: 1,
      sourceFile: "event/ban.js",
  },  {
      name: "hypeBegin",
      aliases: [],
      enabled: 1,
      sourceFile: "event/hypetrain.js",
  },  {
      name: "hypeUpdate",
      aliases: [],
      enabled: 1,
      sourceFile: "event/hypetrain.js",
  },  {
      name: "hypeEnd",
      aliases: [],
      enabled: 1,
      sourceFile: "event/hypetrain.js",
  },  {
      name: "cheer",
      aliases: [],
      enabled: 1,
      sourceFile: "event/bits.js",
  },  {
      name: "follow",
      aliases: [],
      enabled: 1,
      sourceFile: "event/follow_sub.js",
  },  {
      name: "subscribe",
      aliases: [],
      enabled: 1,
      sourceFile: "event/follow_sub.js",
  },  {
      name: "unsubscribe",
      aliases: [],
      enabled: 1,
      sourceFile: "event/follow_sub.js",
  },  {
      name: "gift",
      aliases: [],
      enabled: 1,
      sourceFile: "event/follow_sub.js",
  },  {
      name: "subcribe_message",
      aliases: [],
      enabled: 1,
      sourceFile: "event/follow_sub.js",
  },  {
      name: "streamOnline",
      aliases: ["streamOffline"],
      enabled: 1,
      sourceFile: "event/streamstatus.js",
  },  {
      name: "update",
      aliases: [],
      enabled: 1,
      sourceFile: "event/streamstatus.js",
  },  {
      name: "raid",
      aliases: [],
      enabled: 1,
      sourceFile: "event/raid.js",
  },  {
      name: "channelpoint_add",
      aliases: [],
      enabled: 1,
      sourceFile: "event/channelpoint.js",
  },  {
      name: "channelpoint_remove",
      aliases: [],
      enabled: 1,
      sourceFile: "event/channelpoint.js",
  },  {
      name: "channelpoint_update",
      aliases: [],
      enabled: 1,
      sourceFile: "event/channelpoint.js",
  },  {
      name: "channelpoint_redeem",
      aliases: [],
      enabled: 1,
      sourceFile: "event/channelpoint.js",
  },  {
      name: "pollBegin",
      aliases: [],
      enabled: 1,
      sourceFile: "event/polling.js",
  },  {
      name: "pollEnd",
      aliases: [],
      enabled: 1,
      sourceFile: "event/polling.js",
  },  {
      name: "pollUpdate",
      aliases: [],
      enabled: 1,
      sourceFile: "event/polling.js",
  },  {
      name: "predictionBegin",
      aliases: [],
      enabled: 1,
      sourceFile: "event/predictions.js",
  },  {
      name: "predictionEnd",
      aliases: [],
      enabled: 1,
      sourceFile: "event/predictions.js",
  },  {
      name: "predictionLock",
      aliases: [],
      enabled: 1,
      sourceFile: "event/predictions.js",
  },  {
      name: "predictionUpdate",
      aliases: [],
      enabled: 1,
      sourceFile: "event/predictions.js",
  },
];

/* This is the list of responders that come packed in out of the box as examples
 * for the command system to work with. These are not necessarily expected to
 * always exist, but for the purposes of the demo they should.
 *
 * As such, the bootstrap code below makes sure that they're inserted into the
 * database if they're missing. */
const responders = [
  {
      name: "$code",
      aliases: ["$repo"],
      text: _(`The code for this simple bot can be found in the repository at
              https://github.com/OdatNurd/devember-2021 ; if you have any questions
              about it or how it works don't hestiate to ask!`),
      userLevel: 5,
      cooldown: 10000
  },
];


// =============================================================================


/* This does the work of bootstrapping the contents of a particular table given
 * a list of items that should be there, by doing a check to make sure that all
 * of them can be found.
 *
 * This could be made better by trying to parallelize this, but the number of
 * items that need to be bootstrapped is relatively small and the bot is meant
 * to be mostly long running, so we're going to skip that for the time being
 * and we can revisit when it's discovered to be a problem. */
async function bootstrap(api, modelName, items)
{
  let inserted = 0;
  const model = api.db.getModel(modelName);

  api.log.info(`bootstrapping ${modelName}`);

  // Iterate over all items, and add them if they're missing
  await Promise.all(items.map(async (item) => {
    const record = await model.findOne( { name: item.name });
    if (record === undefined) {
      inserted++;
      api.log.info(`inserting: ${item.name}`);
      await model.create(item);
    }
  }));

  // Only say a count if we did anything.
  if (inserted !== 0) {
    api.log.info(`bootstrapped ${inserted} ${modelName}`);
  }
}

// =============================================================================


/* This function takes care of making sure that the data that we need seeded
 * into the database for things to work is present before we finish starting up
 * the bot.
 *
 * This assumes that the database is already started, which means that all of
 * the required tables and models already exist. Thus, this only needs to insert
 * any records that are required to get things up and running.
 *
 * This *SHOULD NOT* modify any data that already exists; the user should remove
 * records that they want reverted and not rely on this to put it back. */
async function bootstrap_core_data(api) {
  // Bootstrap all missing core items in turn.
  await bootstrap(api, 'commands', commands);
  await bootstrap(api, 'events', events);
  await bootstrap(api, 'responders', responders);
}


// =============================================================================


module.exports = bootstrap_core_data;
