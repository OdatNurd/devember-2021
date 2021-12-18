'use strict';


// =============================================================================


/* When enabling or disabling commands, these specify the values the parameters
 * can take and what they map to. */
const enable_options = {
  true: 1,
  on: 1,

  false: 0,
  off: 0
};

/* When changing the access level of a command, this specifies what values the
 * argument can take and what the resulting edited value should be. */
const access_options = {
  broadcaster: 0,
  broadcast: 0,
  channel:0,

  moderator: 1,
  mod: 1,

  vip: 2,
  vips: 2,

  regular: 3,
  regulars: 3,
  regs: 3,

  subscriber: 4,
  sub: 4,
  subs: 4,

  all: 5,
  everyone: 5,
  rabble: 5
}

/* When displaying the access level of a command, this array maps the integral
 * access levels with a textual name. */
const access_display = [
  'broadcaster',
  'moderators',
  'VIPs',
  'regulars',
  'subscribers',
  'everyone'
]


// =============================================================================


/* This command provides support for changing the state of commands on the fly,
 * allowing you to adjust their access levels, cooldowns and whether or not
 * they're enabled.
 *
 * Currently this requires you to specify a single command; in future this could
 * be adjusted to allow for an arbitrarily long list of commands. */
function edit_command(api, details, userInfo) {
  // There should be exactly 1 word in the word list, which will tell us the
  // command that we're working with. If that's not the case, display usage
  // information and exit.
  if (details.words.length !== 1) {
    api.chat.say(`Usage: ${details.command} enable=true|false ` +
                 `access=level cooldown=secs <command> ; ` +
                 `change any options, or just give a command to see the current state`);
    return;
  }

  // Look up the command to be viewed or edited; we can leave if it does not
  // exist.
  const cmd = api.commands.find(details.words[0]);
  if (cmd === null) {
    api.chat.say(`there is no command named ${details.words[0]} ; check spelling?`)
    return;
  }

  // Based on the values of different parameters, add in fields that we can use
  // to adjust the state of the command.
  const mods = { };
  const enable = details.params.get('enable');
  const access = details.params.get('access');
  const cooldown = details.params.get('cooldown');

  // Is the user trying to change the enable/disable state?
  if (enable !== undefined) {
    mods.enabled = enable_options[enable];
    if (mods.enabled === undefined) {
      api.chat.say(`Invalid value for enable: possible values are ${Object.keys(enable_options).join(', ')}`);
      return;
    }
  }

  // Is the user trying to change the access level?
  if (access !== undefined) {
    mods.userLevel = access_options[access];
    if (mods.userLevel === undefined) {
      api.chat.say(`Invalid value for access: possible values are ${Object.keys(access_options).join(', ')}`);
      return
    }
  }

  // Is the user trying to change the cooldown time?
  if (cooldown !== undefined) {
    mods.cooldown = parseInt(cooldown) * 1000;
    if (isNaN(mods.cooldown) === true) {
      api.chat.say(`Invalid value for cooldown; expected a time in seconds`);
      return
    }
  }

  api.log.info(mods);
  if (Object.keys(mods).length === 0) {
    api.chat.say(`command details: ${cmd.name}, ${cmd.enabled} ${cmd.userLevel} ${cmd.cooldown}`);
    return;
  }


}

// =============================================================================

// All commands here are going to have to update the database, so make a single
// helper method which can update the database given a patch record.
//
// With the exception of the info command, none of these commands should opeate
// on an alias, requiring you to specify the core command instead (the error
// should tell you what that is).
//
//
//
// Commands that we want:
//   $enable [command]
//   $disable [command]
//   - Enable or disable a particular command; make sure that it can't disable
//     itself to avoid future comedic effect. Implement this as a single command
//     that knows what to do based on the name it's invoked with.
//
//   $access [command] <level>
//   - View or edit the access level of the commad; if no level is given this
//     will display it instead. For security purposes this could not allow
//     editing the access level either of itself or of any core command. A
//     setting maybe?
//
//   $cooldown [command] <time>
//   - View or edit the access level of the command; if no time is given it will
//     display it instead. The time can be specified with a suffix of s, m or h
//     to specify seconds, minutes or hours with a default of seconds.
//
//   $alias add command alias
//   $alias delete alias
//   $alias command
//   - Add a new alias for a command, delete a specific alias for an existing
//     command, or see the list of aliases for a command. In this one instance
//     this can be invoked on an alias. It will display information on the
//     aliases available for whatever the command is.
//
//   $cmdinfo [command]
//   - Display all information about a command that is available from the db
//     all in one place. For an alias, this would display that.

// =============================================================================


module.exports = {
  load: async api => {
    return {
      '$edit': edit_command
    };
  },

  unload: async api => {
  }
};
