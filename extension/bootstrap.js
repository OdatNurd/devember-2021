
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
      sourceFile: "command/cmd_add.js",
      core: 1,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$removecommand",
      aliases: ["$delcmd", "$rmcmd"],
      enabled: 1,
      sourceFile: "command/cmd_add.js",
      core: 1,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$enable",
      aliases: ["$disable"],
      enabled: 1,
      sourceFile: "command/cmd_edits.js",
      core: 1,
      hidden: 0,
      userLevel: 0,
      cooldown: 0
  },
  {
      name: "$accesslevel",
      aliases: ["$access"],
      enabled: 1,
      sourceFile: "command/cmd_edits.js",
      core: 1,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },  {
      name: "$cooldown",
      aliases: [],
      enabled: 1,
      sourceFile: "command/cmd_edits.js",
      core: 1,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },  {
      name: "$alias",
      aliases: ["$aliases"],
      enabled: 1,
      sourceFile: "command/cmd_edits.js",
      core: 1,
      hidden: 0,
      userLevel: 1,
      cooldown: 0
  },  {
      name: "$cmdinfo",
      aliases: ["$info"],
      enabled: 1,
      sourceFile: "command/cmd_edits.js",
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
  for (const item of items) {
    const record = await model.findOne( { name: item.name });
    if (record === undefined) {
      inserted++;
      api.log.info(`inserting: ${item.name}`);
      await model.create(item);
    }
  }

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
}


// =============================================================================


module.exports = bootstrap_core_data;
