// =============================================================================


const { dedent: _ } = require('../../utils')


// =============================================================================


const os = require('os');
const path = require('path');
const { existsSync, copyFileSync, constants } = require('fs');

const { CommandParser } = require('../../core/command');
const { usage, cooldownToString, stringToCooldown,
        userLevelToString, stringToUserLevel,
        command_prefix_list, isValidCmdName,
        persistItemChanges } = require('../../utils');


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
function getCmdTarget(api, cmd, name, allowAlias, allowCore) {
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
  const target = getCmdTarget(api, cmd, cmd.words[0], true, true);
  if (target === null) {
    return;
  }

  // Create aliased values for all of the information that we're about to
  // display so that the final message is easier to understand.
  const name = target.name;
  const visible = (target.hidden === true ? 'hidden ' : '');
  const type = (target.core === true ? 'core' : 'regular');
  const src = target.sourceFile;
  const access = userLevelToString(target.userLevel);
  const status = (target.enabled === true) ? 'enabled' : 'disabled';
  const aliases = (target.aliases.length === 0) ? 'none': target.aliases.join(',');
  const cooldown = (target.cooldown === 0) ? 'no cool down' :
                    `a cool down of ${cooldownToString(target.cooldown)}`;
  const missing = (target.handler === null || target.handler === undefined)
                    ? ' (handler is currently missing)' : '';

  // Send out the display
  api.chat.say(_(`${name} is a ${visible}${type} command implemented in ${src}
                 requiring access level ${access} with ${cooldown}
                 , and is ${status}${missing}; aliases: ${aliases}`));
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
  const target = getCmdTarget(api, cmd, cmd.words[0], false, false);
  if (target === null) {
    return;
  }

  // Indicate if the command was already in the desired state.
  if (target.enabled === enabled) {
    api.chat.say(`${target.name} is already ${enabled === true ? 'enabled' : 'disabled'}`);
    return;
  }

  // Update the command with the changes, then report them.
  await persistItemChanges(api, 'commands', target, { enabled });
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
  const target = getCmdTarget(api, cmd, cmd.words[0], false, false);
  if (target === null) {
    return;
  }

  // If we only got a command name, then display the current level and leave.
  if (cmd.words.length === 1) {
    api.chat.say(`the access level for ${target.name} is currently set to ${userLevelToString(target.userLevel)}`);
    return;
  }

  // Look up the appropriate user level based on the argument provided.
  const userLevel = stringToUserLevel(cmd.words[1]);
  if (userLevel === undefined) {
    api.chat.say(`${cmd.words[1]} is not a valid access level; valid levels are: ${levels.join(',')}`);
    return;
  }

  // Update the command with the changes, then report them.
  await persistItemChanges(api, 'commands', target, { userLevel });
  api.chat.say(`the access level for ${target.name} has been set to ${userLevelToString(userLevel)}`);
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
  const target = getCmdTarget(api, cmd, cmd.words[0], false, false);
  if (target === null) {
    return;
  }

  // If we only got a command name, then display the current cooldown and leave.
  if (cmd.words.length === 1) {
    const curCool = (target.cooldown === 0) ? 'no cool down' :
                     `a cool down of ${cooldownToString(target.cooldown)}`;

    api.chat.say(`the cool down timer for ${target.name} is currently set to ${curCool}`);
    return;
  }

  // Look up the appropriate user level based on the argument provided.
  const cooldown = stringToCooldown(api, cmd.words[1]);
  if (cooldown === undefined) {
    api.chat.say(`${cmd.words[1]} is not a valid cool down specification; valid formats are: ${specs.join(',')}`);
    return;
  }

  const newCool = (cooldown === 0) ? 'no cool down' :
                   `a cool down of ${cooldownToString(cooldown)}`;

  // Update the command with the changes, then report them.
  await persistItemChanges(api, 'commands', target, { cooldown });
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
  const target = getCmdTarget(api, cmd, cmd.words[1], false, true);
  if (target === null) {
    return errReturn;
  }

  // As a special rule here, the enable command is special and uses the name
  // that it's invoked with to know what to do, so it's exempt from being
  // aliased, even though other core commands can indeed be aliased.
  if (target.name.endsWith('enable') === true) {
    api.chat.say(_(`The ${target.name} command cannot be aliased; it uses the name
                    it is invoked with to know what to do`));
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
  if (isValidCmdName(alias[0]) === false) {
    api.chat.say(_(`${cmd.words[2]} cannot be used as an alias; it does not have a command prefix.
                     Did you mean to include one of '${command_prefix_list}'?`));
    return errReturn;
  }

  return [target, alias, { aliases: [...target.aliases, alias] }];
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
  const alias = getCmdTarget(api, cmd, cmd.words[1], true, true);
  if (alias === null) {
    return errReturn;
  }

  // As a special rule here, the enable command is special and uses the name
  // that it's invoked with to know what to do, so it's exempt from being
  // aliased, even though other core commands can indeed be aliased.
  if (alias.name.endsWith('enable') === true) {
    api.chat.say(_(`The ${alias.name} command does not allow alias changes; it
                   uses the name it is invoked with to know what to do`));
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
      target = getCmdTarget(api, cmd, cmd.words[0], true, true);
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
  await persistItemChanges(api, 'commands', target, update);
  if (postUpdate !== undefined) {
    postUpdate();
  }
  api.chat.say(`aliases for the ${target.name} command are now: ${target.aliases}`);
}


// =============================================================================


/* This command allows for adding in a new command dynamically without having
 * to create the files and update the database yourself.
 *
 * This is done by making a copy of a stub file and putting it into place in the
 * appropriate directory, then adding a record to the database and requesting
 * that it be reloaded to bring the command into existence. */
async function add_new_command(api, cmd, userInfo) {
  // We expect to be given the name of a new command and optionally the name of
  // the file that it should be stored in; if we don't have at least one
  // argument, then we're unhappy.
  if (cmd.words.length < 1) {
    return usage(api, cmd, '<newname> [sourceFile]', `dynamically add a new command,
      optionally specifying the source file it lives in`);
  }

  // Get the name of the new item and the file it should be implemented in.
  // The source file is optional and will be inferred from the item name if
  // it's not provided.
  let [newCmdName, newSrcFile] = cmd.words;

  // Infer a missing file from the name of the item being added; if the name
  // is a command, we need to strip the prefixes off the name first.
  if (newSrcFile === undefined) {
    newSrcFile = newCmdName;
    while (isValidCmdName(newSrcFile[0]) === true) {
      newSrcFile = newSrcFile.substr(1);
    }
  }

  // Include an extension on the file if one is missing.
  if (path.extname(newSrcFile) === '') {
    newSrcFile = `${newSrcFile}.js`;
  }

  // If a path separator appears anywhere in the new source file, that's going
  // to be an issue, so kick it out.
  if (newSrcFile.includes('/') || newSrcFile.includes('\\')) {
    api.chat.say(`unable to add new command ${newCmdName}; the implementation file must not have a path`);
    return;
  }

  // Make sure that the command name has a prefix; for brevity we allow the user
  // to not specify one, in which case a default will be used.
  if (isValidCmdName(newCmdName[0]) === false) {
    newCmdName = `${api.config.get('bot.defaultPrefix')}${newCmdName}`;
  }

  // If this name already exists, we can't add it as a command.
  if (api.commands.find(newCmdName) !== null) {
    api.chat.say(`unable to add new command ${newCmdName}; a command by this name already exists`);
    return;
  }

  // Determine the name of the file that this item will be implemented in, and
  // where we should get a stub from if we need to. The file has two names,
  // the one that's physical on the disk and the one that's relative and in
  // the database.
  const implFile = `command/${newSrcFile}`;
  const srcFile = path.resolve(api.baseDir, 'extension/runtime/stubs/command.js');
  const dstFile = path.resolve(api.baseDir, `extension/runtime/${implFile}`);

  api.chat.say(`creating a new command ${newCmdName} in ${implFile}`);

  // Start by adding a new entry to the database for this command and then add
  // a stub entry for it in the handler list so that we can get it to reload.
  await api.db.getModel('commands').create({
    name: newCmdName,
    aliases: [],
    sourceFile: implFile,
    core: false,
    enabled: true,
    hidden: false
  });
  await api.commands.addItemStub(newCmdName);

  // If the file already exists, then we can just get the handler list to
  // reload it; otherwise, we need to take extra steps to get the initial load
  // to happen.
  if (existsSync(dstFile)) {
    // If this implementation file has previously been loaded, then reload
    // it now, otherwise we need to do a fresh load because although the
    // file exists on disk, no commands are currently loaded from it.
    if (api.commands.sources().indexOf(implFile) === -1) {
      api.commands.loadNewFile(implFile);
    } else {
      api.commands.reload([implFile], false);
    }
  } else {
    try {
      // Use COPYFILE_EXCL so that if the destination file exists, the operation
      // fails. This makes sure that when adding a new item using an existing
      // file, we don't clobber over anything.
      api.log.info(`copyFileSync(${srcFile}, ${dstFile}) impl: ${implFile}`);
      copyFileSync(srcFile, dstFile, constants.COPYFILE_EXCL);

      // Tell the command system to load a new file
      api.commands.loadNewFile(implFile);
    } catch (err) {
      api.chat.say(`there was an error while putting the stub command file in place; please check the console`);
      api.nodecg.sendMessage('set-cmd-log', `${err}\n${err.stack}`);
    }
  }
}


// =============================================================================


/* This command allows for dynamically removing a command from the system.
 *
 * This adjusts the database and the command list to ensure that the command
 * doesn't execute, but it leaves the code for the command alone so that it can
 * be recovered if it was removed in error. */
async function remove_existing_command(api, cmd, userInfo) {
  // We expect to be given the name of a new command and optionally the name of
  // the file that it should be stored in; if we don't have at least one
  // argument, then we're unhappy.
  if (cmd.words.length < 1) {
    return usage(api, cmd, '<oldname>', `dynamically remove an existing command`);
  }

  // Get the name of the command that we're removing.
  let [oldCmdName] = cmd.words;

  // If this name doesn't exist, then it can't be removed.
  const oldCmd = api.commands.find(oldCmdName);
  if (oldCmd === null) {
    api.chat.say(`unable to remove command ${oldCmdName} because it does not exist`);
    return;
  }

  // We don't want to allow removing an alias using this, so the command that's
  // looked up has to have the same name as the one the user specified.
  if (oldCmd.name !== oldCmdName) {
    api.chat.say(`unable to remove command ${oldCmdName} because it is an alias; did you mean ${oldCmd.name}?`);
    return;
  }

  // Make sure that we don't let anyone remove a core command, because that is a
  // recipe for disaster.
  if (oldCmd.core === true) {
    api.chat.say(`unable to remove command ${oldCmdName} because core commands can't be removed`);
    return;
  }

  api.chat.say(`removing command ${oldCmdName}`);

  // To get rid of the command, we need to remove it from the database; we can
  // then tell the reloader to reload the file that it's contained inside of,
  // and it will notice that the command is gone and remove it from the lists.
  await api.db.getModel('commands').remove({ id: oldCmd.id });
  api.commands.reload([oldCmd.name], true);
}

// =============================================================================


module.exports = {
  load: async api => {
    return {
      '$addcommand': add_new_command,
      '$removecommand': remove_existing_command,

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
