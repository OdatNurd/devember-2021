'use strict';


// =============================================================================


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


/* Given a command name, find and return the entry in the command list that
 * represents that command and return it back. The allowAlias argument indicates
 * whether or not it's permissible for the command being looked up to be an alias
 * of some other command.
 *
 * The return value is the command entry on success or null on failure, which
 * includes violating constraints on what's allowed.
 *
 * When this returns null, it generates a message to the chat that indicates
 * that the command being executed cannot be executed. */
function getCommand(api, details, name, allowAlias, allowCore) {
  // Find the command named in the command list; if this is null we can
  // immediately generate an error and return back.
  const cmd = api.commands.find(name);
  if (cmd === null) {
    api.chat.say(`unable to locate command ${name}; did you spell it correctly and provide a command prefix?`);
    return null;
  }

  // If this is an alias but they're not allowed, then reject the command.
  if (allowAlias === false && cmd.name !== name) {
    api.chat.say(`${details.command} does not modify aliased commands; did you mean to modify ${cmd.name}?`);
    return null;
  }

  if (allowCore === false && cmd.core === true) {
    api.chat.say(`${details.command} does not modify core commands; to avoid executing them, try the 'role' command`);
    return null;
  }

  return cmd;
}


// =============================================================================


/* This takes a dictionary that contains field changes that should be applied to
 * the command provided and update the record in the database using them, based
 * on the id of the command that is provided.
 *
 * This only touches the fields provided and leaves everything else alone. */
async function storeCmdChanges(api, cmd, changes) {
  // Get the database model for commands and perform the update.
  const model = api.db.getModel('commands');
  await model.update({ id: cmd.id }, changes);

  // We also need to apply the changes directly to the command, or they won't
  // be seen until it reloads and refreshes its information from the database.
  Object.keys(changes).forEach(key => cmd[key] = changes[key]);
}


// =============================================================================


/* Given a command cooldown time in milliseconds, return back a more human
 * readable interpretation of it. */
function displayableCooldown(cooldown) {
  // On a level of 1 to 10, where 1 is gross and 10 is awesome, this rates a
  // disgusting; but it's good enough for the time being.
  return new Date(cooldown)
    .toISOString()
    .substr(11, 8)
    .replace(':', 'h ')
    .replace(':', 'm ') + 's';
}


// =============================================================================


function stub_command(api, details, userInfo) {
  api.chat.say('I\'m a little teapot');
}


// =============================================================================


/* This command allows you to see a visualization of all of the information that
 * is currently known about a specific command, including its aliases and the
 * implementation file it's stored in. */
function get_command_info(api, details, userInfo) {
  // We need to be given a command name.
  if (details.words.length === 0) {
    api.chat.say(`Usage: ${details.command} command`);
    return;
  }

  // Get the target command or leave; on error, this displays an error for us.
  const cmd = getCommand(api, details, details.words[0], true, true);
  if (cmd === null) {
    return;
  }

  // Create aliased values for all of the information that we're about to
  // display so that the final message is easier to understand.
  const name = cmd.name;
  const visible = (cmd.hidden === true ? 'hidden ' : '');
  const type = (cmd.core === true ? 'core' : 'regular');
  const src = cmd.sourceFile;
  const access = access_display[cmd.userLevel];
  const status = (cmd.enabled === true) ? 'enabled' : 'disabled';
  const aliases = (cmd.aliases.length === 0) ? 'none': cmd.aliases.join(',');
  const cooldown = (cmd.cooldown === 0) ? 'no cool down' :
                    `a cool down of ${displayableCooldown(cmd.cooldown)}`;

  // Send out the display
  api.chat.say(`${name} is a ${visible}${type} command implemented in ${src} ` +
               `requiring access level ${access} with ${cooldown}` +
               `, and is ${status}; aliases: ${aliases}`);
}


// =============================================================================


/* This command allows you to enable or disable a command in order to control if
 * it is accessible or not. Unlike the access level and cooldown checks, a
 * command that is disabled cannot be executed by anyone.
 *
 * This function serves both the enable and disable option and can determine
 * which of the two it's supposed to do based on the name that it's invoked
 * with. */
async function change_enabled_state(api, details, userInfo) {
  // We need to be given a command name.
  if (details.words.length === 0) {
    api.chat.say(`Usage: ${details.command} command`);
    return;
  }

  // Get the target command or leave; on error, this displays an error for us.
  const cmd = getCommand(api, details, details.words[0], false, true);
  if (cmd === null) {
    return;
  }

  // The command can either enable or disable a command; how this works depends
  // on the name that it's invoked with.
  const enabled = (details.command.endsWith('enable'));

  // Update the command with the changes, then report them.
  await storeCmdChanges(api, cmd, { enabled })
  api.chat.say(`the ${cmd.name} command status has been set to ${enabled === true ? 'enabled' : 'disabled'}`);
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
//     Aliases should not be allowed on core commands, since they may rely on
//     the name they're invoked with to know what to do.



// =============================================================================


module.exports = {
  load: async api => {
    return {
      '$enable': change_enabled_state,
      '$access': stub_command,
      '$cooldown': stub_command,
      '$alias': stub_command,
      '$cmdinfo': get_command_info
    };
  },

  unload: async api => {
  }
};
