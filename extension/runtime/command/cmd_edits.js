'use strict';


// =============================================================================


const { CommandParser } = require('../../core/command');
const { usage } = require('../../utils');


// =============================================================================


/* When changing the access level of a command, this specifies what values the
 * argument can take and what the resulting edited value should be. */
const access_options = {
  broadcaster: 0,
  broadcast: 0,
  channel:0,
  streamer:0,

  moderator: 1,
  mod: 1,
  mods: 1,

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
function getCommand(api, cmd, name, allowAlias, allowCore) {
  // Find the command named in the command list; if this is null we can
  // immediately generate an error and return back.
  const target = api.commands.find(name);
  if (target === null) {
    api.chat.say(`unable to locate command ${name}; did you spell it correctly and provide a command prefix?`);
    return null;
  }

  // If this is an alias but they're not allowed, then reject the command.
  if (allowAlias === false && target.name !== name) {
    api.chat.say(`${cmd.name} does not modify aliased commands; did you mean to modify ${target.name}?`);
    return null;
  }

  if (allowCore === false && target.core === true) {
    api.chat.say(`${cmd.name} does not modify core commands; to avoid executing them, try the 'role' command`);
    return null;
  }

  return target;
}


// =============================================================================


/* This takes a dictionary that contains field changes that should be applied to
 * the command provided and update the record in the database using them, based
 * on the id of the command that is provided.
 *
 * This only touches the fields provided and leaves everything else alone. */
async function storeCmdChanges(api, command, changes) {
  // Get the database model for commands and perform the update.
  const model = api.db.getModel('commands');
  await model.update({ id: command.id }, changes);

  // We also need to apply the changes directly to the command, or they won't
  // be seen until it reloads and refreshes its information from the database.
  Object.keys(changes).forEach(key => command[key] = changes[key]);
}


// =============================================================================


/* Given a command cool down time in milliseconds, return back a more human
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


/* This takes an input string in a format that is a number followed by one of
 * the characters 's', 'm' or 'h' and converts it into an appropriate number of
 * milliseconds to represent that number of seconds, minutes or hours.
 *
 * If the incoming string is not in a recognized format, undefined will be
 * returned; otherwise the time in milliseconds is returned. */
function parseCooldownSpec(spec) {
  // The last character is the time specifier, and the remainder of the string
  // is the time in that unit; grab them both out.
  const value = spec.substr(0, spec.length - 1);
  const unit = spec[spec.length - 1];

  // The incoming value needs to be a valid number, or we're unhappy
  const cooldown = parseFloat(value);
  if (isNaN(cooldown) === true) {
    return;
  }

  // Based on the time unit, multiple the value on the way out.
  switch (unit) {
    case 's':
      return cooldown * 1000;

    case 'm':
      return cooldown * (1000 * 60);

    case 'h':
      return cooldown * (1000 * 60 * 60);

    default:
      api.log.error(`parseCooldownSpec is not properly handling the time unit '${unit}'`);
      return;
  }
}


// =============================================================================


/* This command allows you to see a visualization of all of the information that
 * is currently known about a specific command, including its aliases and the
 * implementation file it's stored in. */
function get_command_info(api, cmd, userInfo) {
  // We need to be given a command name.
  if (cmd.words.length === 0) {
    return usage(api, cmd, '<command>', `display information about the given
      command or alias`);
  }

  // Get the target command or leave; on error, this displays an error for us.
  const target = getCommand(api, cmd, cmd.words[0], true, true);
  if (target === null) {
    return;
  }

  // Create aliased values for all of the information that we're about to
  // display so that the final message is easier to understand.
  const name = target.name;
  const visible = (target.hidden === true ? 'hidden ' : '');
  const type = (target.core === true ? 'core' : 'regular');
  const src = target.sourceFile;
  const access = access_display[target.userLevel];
  const status = (target.enabled === true) ? 'enabled' : 'disabled';
  const aliases = (target.aliases.length === 0) ? 'none': target.aliases.join(',');
  const cooldown = (target.cooldown === 0) ? 'no cool down' :
                    `a cool down of ${displayableCooldown(target.cooldown)}`;
  const missing = (target.handler === null || target.handler === undefined)
                    ? ' (handler is currently missing)' : '';

  // Send out the display
  api.chat.say(`${name} is a ${visible}${type} command implemented in ${src} ` +
               `requiring access level ${access} with ${cooldown}` +
               `, and is ${status}${missing}; aliases: ${aliases}`);
}


// =============================================================================


/* This command allows you to enable or disable a command in order to control if
 * it is accessible or not. Unlike the access level and cooldown checks, a
 * command that is disabled cannot be executed by anyone.
 *
 * This function serves both the enable and disable option and can determine
 * which of the two it's supposed to do based on the name that it's invoked
 * with. */
async function change_enabled_state(api, cmd, userInfo) {
  // The command can either enable or disable a command; how this works depends
  // on the name that it's invoked with.
  const enabled = (cmd.name.endsWith('enable'));

  // As a sanity check, if the command name is not enable, it has to be disable
  // or someone somehow set up an alias when they should not have been allowed
  // to.
  if (enabled === false && cmd.name.endsWith('disable') === false) {
    api.chat.say(`${cmd.name} cannot be executed; the underlying command should not be aliased.`);
    return;
  }

  // We need to be given a command name.
  if (cmd.words.length === 0) {
    return usage(api, cmd, '<command>', (enabled === true)
      ? `enable the given command so it can be executed`
      : `disable the given command so it can no longer be executed`);
  }

  // Get the target command or leave; on error, this displays an error for us.
  const target = getCommand(api, cmd, cmd.words[0], false, false);
  if (target === null) {
    return;
  }

  // Indicate if the command was already in the desired state.
  if (target.enabled === enabled) {
    api.chat.say(`${target.name} is already ${enabled === true ? 'enabled' : 'disabled'}`);
    return;
  }

  // Update the command with the changes, then report them.
  await storeCmdChanges(api, target, { enabled })
  api.chat.say(`the ${target.name} command status has been set to ${enabled === true ? 'enabled' : 'disabled'}`);
}


// =============================================================================


/* This command allows you to easily view or change the access level required to
 * run a particular command. The list of access levels that can be specified is
 * an enhanced list that includes various aliased names for levels to make the
 * command more natural to run. */
async function change_access_level(api, cmd, userInfo) {
  // The levels we use in our display here; the actual values supported is a
  // much larger list, to make commands more natural.
  const levels = ['streamer', 'mods', 'vips', 'regs', 'subs', 'all'];

  // We need to be given a command name.
  if (cmd.words.length < 1) {
    return usage(api, cmd, `<command> <${levels.join('|')}>`, `change the access
      level required to execute a command`);
  }

  // Get the target command or leave; on error, this displays an error for us.
  const target = getCommand(api, cmd, cmd.words[0], false, false);
  if (target === null) {
    return;
  }

  // If we only got a command name, then display the current level and leave.
  if (cmd.words.length === 1) {
    api.chat.say(`the access level for ${target.name} is currently set to ${access_display[target.userLevel]}`);
    return;
  }

  // Look up the appropriate user level based on the argument provided.
  const userLevel = access_options[cmd.words[1]];
  if (userLevel === undefined) {
    api.chat.say(`${cmd.words[1]} is not a valid access level; valid levels are: ${levels.join(',')}`)
    return;
  }

  // Update the command with the changes, then report them.
  await storeCmdChanges(api, target, { userLevel })
  api.chat.say(`the access level for ${target.name} has been set to ${access_display[userLevel]}`);
}


// =============================================================================


/* This command allows you to view or change the cooldown timer associated with
 * a specific command. Every command can have a cooldown period that limits how
 * frequently it can be executed.
 *
 * The broadcaster and mods are always exempt from the cooldown timer and can
 * execute the command at any time. */
async function change_cmd_cooldown(api, cmd, userInfo) {
  // The possible formats for times that we use in our display here; the actual
  // values are parsed from user input in this style.
  const specs = ['##.#s', '##.#m', '##.#h'];

  // We need to be given a command name.
  if (cmd.words.length < 1) {
    return usage(api, cmd, `<command> <${specs.join('|')}>`, `specify the time
      required between invocations of a command. The broadcaster and mods are
      exempt from the cooldown restructions`);
  }

  // Get the target command or leave; on error, this displays an error for us.
  const target = getCommand(api, cmd, cmd.words[0], false, false);
  if (target === null) {
    return;
  }

  // If we only got a command name, then display the current cooldown and leave.
  if (cmd.words.length === 1) {
    const curCool = (target.cooldown === 0) ? 'no cool down' :
                     `a cool down of ${displayableCooldown(target.cooldown)}`;

    api.chat.say(`the cool down timer for ${target.name} is currently set to ${curCool}`);
    return;
  }

  // Look up the appropriate user level based on the argument provided.
  const cooldown = parseCooldownSpec(cmd.words[1]);
  if (cooldown === undefined) {
    api.chat.say(`${cmd.words[1]} is not a valid cool down specification; valid formats are: ${specs.join(',')}`)
    return;
  }

  const newCool = (cooldown === 0) ? 'no cool down' :
                   `a cool down of ${displayableCooldown(cooldown)}`;

  // Update the command with the changes, then report them.
  await storeCmdChanges(api, target, { cooldown })
  api.chat.say(`the cool down time for ${target.name} has been set to ${newCool}`);
}


// =============================================================================


/* This helper for the alias add command assumes that it's being called from the
 * alias command and that there are enough arguments available for the main
 * command to know that it's an addition.
 *
 * This will check the remaining arguments for validity and, if all is well,
 * return back an array of items that represents the command that is going to
 * have an alias added and an update object to be used to update the database
 * to put the new alias in effect.
 *
 * On any error, this returns a null command and an empty update dictionary. */
function handle_alias_add(api, cmd, userInfo) {
  const errReturn = [null, null, {}];

  // For an add, we need to have at least 3 arguments; the add operation, the
  // command to add the alias to, and the new alias itself.
  if (cmd.words.length < 3) {
    usage(api, cmd, 'add <command> <alias>', `add an alias for the command to
      be able to execute it via another name`);
    return errReturn;
  }

  // We already know this is an add, so fetch the command that we want to set
  // the alias on.
  const target = getCommand(api, cmd, cmd.words[1], false, true);
  if (target === null) {
    return errReturn;
  }

  // As a special rule here, the enable command is special and uses the name
  // that it's invoked with to know what to do, so it's exempt from being
  // aliased, even though other core commands can indeed be aliased.
  if (target.name.endsWith('enable') === true) {
    api.chat.say(`The ${target.name} command cannot be aliased; it uses the name ` +
                 `it is invoked with to know what to do`);
    return errReturn;
  }

  // The last argument is the new alias text; this needs to be something that
  // doesn't already exist in the commands list at all.
  const alias = cmd.words[2];
  const checkCmd = api.commands.find(alias);
  if (checkCmd !== null) {
    api.chat.say(`${alias} cannot be used as an alias; it already resolves to ${checkCmd.name}`);
    return errReturn;
  }

  // The first character of the proposed new alias needs to be a valid prefix
  // character, or the alias will never be able to execute.
  if (CommandParser.VALID_PREFIX_LIST.indexOf(alias[0]) === -1) {
    api.chat.say(`${cmd.words[2]} cannot be used as an alias; it does not have a command prefix. ` +
                 `Did you mean to include one of '${CommandParser.VALID_PREFIX_LIST}'`);
    return errReturn;
  }

  return [target, alias, { aliases: [...target.aliases, alias] }]
}


// =============================================================================


/* This helper for the alias add command assumes that it's being called from the
 * alias command and that there are enough arguments available for the main
 * command to know that it's an addition.
 *
 * This will check the remaining arguments for validity and, if all is well,
 * return back an array of items that represents the command that is going to
 * have an alias added and an update object to be used to update the database
 * to put the new alias in effect.
 *
 * On any error, this returns a null command and an empty update dictionary. */
function handle_alias_remove(api, cmd, userInfo) {
  const errReturn = [null, null, {}];

  // For a remove, we need only two arguments; the remove operation and the
  // alias that is to be removed. The command that is aliased to will be
  // inferred from the alias itself.
  if (cmd.words.length < 2) {
    usage(api, cmd, 'remove <alias>', `remove a command alias`);
    return errReturn;
  }

  // We already know this is a remove, so fetch the command that represents the
  // alias that we want to remove. Here we want to make sure that aliases are
  // allowed, since they are in fact required.
  const alias = getCommand(api, cmd, cmd.words[1], true, true);
  if (alias === null) {
    return errReturn;
  }

  // As a special rule here, the enable command is special and uses the name
  // that it's invoked with to know what to do, so it's exempt from being
  // aliased, even though other core commands can indeed be aliased.
  if (alias.name.endsWith('enable') === true) {
    api.chat.say(`The ${alias.name} command does not allow alias changes; it uses the name ` +
                 `it is invoked with to know what to do`);
    return errReturn;
  }

  // The command that we got needs to be an alias; otherwise someone is trying
  // to remove a command, which is not allowed here.
  if (alias.name === cmd.words[1]) {
    api.chat.say(`${alias.name} is not an alias; it cannot be removed by this command`);
    return errReturn;
  }

  return [alias, cmd.words[1], { aliases: alias.aliases.filter(name => name !== cmd.words[1])}];
}


// =============================================================================


//   $alias command
async function modify_cmd_aliases(api, cmd, userInfo) {
  // At a minimum, we need to receive at least one argument, which will tell us
  // what we;re trying to do.
  if (cmd.words.length < 1) {
    return usage(api, cmd, '[add|remove] <command> [alias]', `add or remove aliases
      for a command; specify only a command name to view the aliases for that
      command`);
  }

  let target = undefined;
  let alias = undefined;
  let update = undefined;
  let postUpdate = undefined;

  switch(cmd.words[0]) {
    case 'add':
      // Use the sub handler to get the aliased command and the new alias; this
      // will do error checking and return a null command on error.
      [target, alias, update] = handle_alias_add(api, cmd, userInfo);

      // If the add looks like it's correct, then set up a handler to update the
      // command list as appropriate.
      if (target !== null) {
        postUpdate = () => api.commands.addAlias(target.name, alias);
      }
      break;

    case 'remove':
      // Use the sub handler to get the aliased command and the alias to remove;
      // this will do error checking and return a null command on error.
      [target, alias, update] = handle_alias_remove(api, cmd, userInfo);

      // If the remove looks like it's correct, then set up a handler to update
      // the command list as appropriate.
      if (target !== null) {
        postUpdate = () => api.commands.removeAlias(target.name, alias);
      }
      break;

    // If we get here, we got what should be a command, so display the list of
    // aliases for it. The command itself might be an alias, but this always
    // displays based on the native command.
    default:
      // Get the target command or leave; on error, this displays an error for us.
      target = getCommand(api, cmd, cmd.words[0], true, true);
      if (target === null) {
        return;
      }

      const aliases = (target.aliases.length === 0) ? 'none': target.aliases.join(',');

      // Send out the display
      api.chat.say(`aliases for the ${target.name} command : ${aliases}`);
      return;
  }


  // If we get to this point and target is null, then the add or remove operation
  // was not valid for some reason, so just leave.
  if (target === null) {
    return;
  }

  // Update the command with the changes, then report them.
  await storeCmdChanges(api, target, update);
  if (postUpdate !== undefined) {
    postUpdate();
  }
  api.chat.say(`aliases for the ${target.name} command are now: ${target.aliases}`);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      '$enable': change_enabled_state,
      '$accesslevel': change_access_level,
      '$cooldown': change_cmd_cooldown,

      // This command specifically does not allow the enable command or its
      // aliases to be modified; change the code if we decide to change the
      // names that command is known by.
      '$alias': modify_cmd_aliases,
      '$cmdinfo': get_command_info
    };
  },

  unload: async api => {
  }
};
