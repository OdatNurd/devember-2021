'use strict';


// =============================================================================


/* This command can be used to toggle debug handling on and off as well as
 * adjust the list of people for whom debugging is enabled.
 *
 * This ultimately sets up flags in the API that the internal chat handler uses
 * to know if it should log or not. */
function debug_command(api, cmd, userInfo) {
  // Shallow clone the list of words so we can manipulate it.
  const args = [...cmd.words];

  // If the first argument is a single word, then it can be either an
  // instruction on changing the setup, OR a single user to modify.
  if (args.length === 1) {
    switch (args[0]) {
      // Enable or disable the debug logging.
      case 'on':
      case 'off':
        api.debugMsgs = (args[0] === 'on') ? 1 : 0;

        // Get rid of this so the command appears to have no args and then
        // break so the code below will display the new state.
        args.pop();
        break;

      // Show the list of users that have debug logging turned on
      case 'users':
        api.chat.say(`chat message debug logging will be done for ` +
                     `${api.debugMsgsFrom.length === 0
                        ? 'all users'
                        : api.debugMsgsFrom.join(', ')}`);
        return;

      // Anything else is a user, but in that case leave the argument alone and
      // do nothing. It will be picked up by the handler below that modifies
      // users.
      default:
        break;
    }
  }

  // If we're executed with no arguments, indicate if debugging is turned on or
  // not and how to adjust the list of debugged users.
  if (args.length === 0) {
    const state = (api.debugMsgs === 0) ? 'disabled' : 'enabled';
    api.chat.say(`chat message debug logging is currently ${state}; ` +
                 `use ${cmd.name} [on|off|users] to change the state or view users, ` +
                 `or give a list of users to add or remove from the list`);
    return;
  }

  let added = 0;
  let removed = 0;

  // If we get here there are arguments, and they're users that need to be
  // either added or removed. Adjust the list by adding or removing depending
  // on the current state, keeping track of the adjustments.
  for (let i = 0 ; i < args.length ; i++) {
    const user = (args[i][0] === '@' ? args[i].substr(1) : args[i]);
    const idx = api.debugMsgsFrom.indexOf(user);

    if (idx === -1) {
      added++;
      api.debugMsgsFrom.push(user);
    } else {
      removed++;
      api.debugMsgsFrom.splice(idx, 1);
    }
  }

  api.chat.say(`chat message debug users adjusted; +${added}/-${removed}, ` +
               `list is ${api.debugMsgsFrom.join(',')}`)
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      '$debug': debug_command
    };
  },

  unload: async api => {
  }
};
