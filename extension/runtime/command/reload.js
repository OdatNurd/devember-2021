'use strict';


// =============================================================================


const { usage } = require('../../utils');


// =============================================================================

/* This command allows for the hot reloading of commands and other items, either
 * by specifying their name or by using a filename glob to capture them.
 *
 * In either case, the reload operation will cause the files affected to be
 * unloaded and reloaded, and the data from the database for those items will be
 * refreshed.  */
async function reload_items(api, cmd, userInfo) {
  // The list of valid options for the mode argument.
  const valid = ['name', 'glob'];

  // If nothing to reload was provided, show usage cmd and leave
  if (cmd.words.length === 0) {
    return usage(api, cmd, '[mode=(glob|*name)] <globspec|name>', `hot reload
      the files that match the spec or name list provided`);
  }

  // Get the mode the user asked for, defaulting to the name mode if one is
  // not provided.
  const mode = cmd.params.get('mode') || 'name';
  if (valid.indexOf(mode) === -1) {
    api.chat.say(`invalid mode '${mode}; valid modes are: ${valid.join(', ')}`);
    return;
  }

  // Ask the command handler to reload based on the information provided.
  const result = await api.commands.reload(cmd.words, mode === 'name');
  switch (result) {
    case true:
      api.chat.say(`reload operation completed`);
      api.nodecg.sendMessage('set-cmd-log', 'The last reload command completed successfully');
      return;

    case false:
      api.chat.say(`nothing found to reload`);
      api.nodecg.sendMessage('set-cmd-log', 'The last reload command did not find anything to reload');
      return;
  }

  // If we get here, the reload resulted in a failure of some sort; turn the
  // error objects into a block of text and transmit it.
  api.chat.say(`error encountered during the reload; please check the console`);
  api.nodecg.sendMessage('set-cmd-log', result.map(err => `${err}\n${err.stack}`).join("\n"))
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
