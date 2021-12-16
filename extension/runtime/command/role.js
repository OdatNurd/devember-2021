'use strict';

// =============================================================================


const os = require('os');


// =============================================================================


/* This command allows for querying the role that all running bots are running
 * running at, what their default command roles have been set to, and changing
 * or clearing the default command role for any specific bot as well.
 *
 * Roles in the bot are used to track multiple installed versions of the bot
 * code runnig inside of the same channel (such as a production and development
 * version) and direct commands to one or the other to avoid ambiguity in cases
 * where it matters.
 *
 * This can be used in conjunction with enabling and disabling commands to
 * control exactly what instance does what.
 *
 * !role                    - View the current role and default
 * !role detault newDefault - Set the default command role
 * !role default            - Remove the default command role
 */
function modify_role(api, details, userInfo) {
  // Used with no arguments, this will tell you the current and default role
  if (details.words.length === 0) {
    const host = os.hostname().split('.')[0];
    const defRole = api.defaultCmdRole || 'none';
    api.chat.say(`Running with role ${api.role}[default=${defRole}] on ${host}` +
                 `; to change, use ${details.command} default [newDefault]`);
    return;
  }

  // With at least one argument, the arg must be the word 'default'; otherwise
  // show usage information.
  if (details.words[0] !== 'default') {
    return api.chat.say(`To change the default, ${details.command} default [newDefault]`)
  }

  // The second word is the new role; undefined and the string 'none' both map
  // to the value undefined, which means no default.
  api.defaultCmdRole = details.words[1] === 'none' ? undefined : details.words[1];
  const newDefRole = api.defaultCmdRole || 'none';

  // Say what happened
  api.chat.say(`Set default command role to ${newDefRole} (configured role is ${api.role})`);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      // Most core commands should (probably) be in the same file for clarity,
      // but the reload command should always be in it's own file, so that
      // an error while reloading a core command doesn't stop anyone's ability
      // to reload and fix the problem.
      '$role': modify_role,
    };
  },

  unload: async api => {
  }
};
