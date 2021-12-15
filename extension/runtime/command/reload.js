'use strict';


// =============================================================================

/* This command allows for the hot reloading of commands and other items, either
 * by specifying their name or by using a filename glob to capture them.
 *
 * In either case, the reload operation will cause the files affected to be
 * unloaded and reloaded, and the data from the database for those items will be
 * refreshed.  */
async function reload_items(api, details, userInfo) {
  // The list of valid options for the mode argument.
  const valid = ['name', 'glob'];

  // If nothing to reload was provided, show usage details and leave
  if (details.words.length === 0) {
    api.chat.say(`Usage: ${details.command} [mode=(glob|*name)] <globspec>`);
    return;
  }

  // Get the mode the user asked for, defaulting to the name mode if one is
  // not provided.
  const mode = details.params.get('mode') || 'name';
  if (valid.indexOf(mode) === -1) {
    api.chat.say(`invalid mode '${mode}; valid modes are: ${valid.join(', ')}`);
    return;
  }

  // Ask the command handler to reload based on the information provided.
  const result = await api.commands.reload(details.words, mode === 'name');
  switch (result) {
    case true:
      api.chat.say(`reload operation completed`);
      break;

    case false:
      api.chat.say(`nothing found to reload`);
      break;

    case null:
    default:
      api.chat.say(`error encountered during the reload; please check the console`);
      break;
  }
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      // Most core commands should (probably) be in the same file for clarity,
      // but the reload command should always be in it's own file, so that
      // an error while reloading a core command doesn't stop anyone's ability
      // to reload and fix the problem.
      '$reload': reload_items,
    };
  },

  unload: async api => {
  }
};
