// =============================================================================


const path = require('path');
const { existsSync, writeFileSync } = require('fs');

const { renderFile } = require('template-file');

const { dedent: _, usage, cooldownToString, stringToCooldown,
        userLevelToString, stringToUserLevel, getDisplayAccessLevels,
        command_prefix_list, isValidCmdName, getValidCmdName,
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

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[0]);

  // Get the target command or leave; on error, this displays an error for us.
  const target = getCmdTarget(api, cmd, nameArg, true, true);
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
 * with. It will however work with any command prefix. */
async function change_enabled_state(api, cmd, userInfo) {
  // The command can either enable or disable a command; how this works depends
  // on the name that it's invoked with.
  const enabled = (cmd.name.endsWith('enable'));

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[0]);

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
  const target = getCmdTarget(api, cmd, nameArg, false, false);
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
  const levels = getDisplayAccessLevels();

  // We need to be given a command name.
  if (cmd.words.length < 1) {
    return usage(api, cmd, `<command> [${levels.join('|')}]`, `change the access
      level required to execute a command or view the current access level`);
  }

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[0]);
  const levelArg = cmd.words[1];

  // Get the target command or leave; on error, this displays an error for us.
  const target = getCmdTarget(api, cmd, nameArg, false, false);
  if (target === null) {
    return;
  }

  // If we only got a command name, then display the current level and leave.
  if (cmd.words.length === 1) {
    api.chat.say(`the access level for ${target.name} is currently set to ${userLevelToString(target.userLevel)}`);
    return;
  }

  // Look up the appropriate user level based on the argument provided.
  const userLevel = stringToUserLevel(levelArg);
  if (userLevel === undefined) {
    api.chat.say(`${levelArg} is not a valid access level; valid levels are: ${levels.join(',')}`);
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
      required between invocations of a command or view the current cooldown.
      The broadcaster and mods are exempt from the cooldown restrictions`);
  }

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[0]);
  const intervalArg = cmd.words[1];

  // Get the target command or leave; on error, this displays an error for us.
  const target = getCmdTarget(api, cmd, nameArg, false, false);
  if (target === null) {
    return;
  }

  // If there is only a command name provided, then display the current
  // cooldown for this item and we can leave.
  if (cmd.words.length === 1) {
    const curCool = (target.cooldown === 0) ? 'no cool down' :
                     `a cool down of ${cooldownToString(target.cooldown)}`;

    api.chat.say(`the cool down timer for ${target.name} is currently set to ${curCool}`);
    return;
  }

  // Parse the given cooldown time specification.
  const cooldown = stringToCooldown(api, intervalArg);
  if (cooldown === undefined) {
    api.chat.say(`${intervalArg} is not a valid cool down specification; valid formats are: ${specs.join(',')}`);
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

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[1]);
  const aliasArg = getValidCmdName(api, cmd.words[2]);

  // We already know this is an add, so fetch the command that we want to set
  // the alias on.
  const target = getCmdTarget(api, cmd, nameArg, false, true);
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
  const checkCmd = api.commands.find(aliasArg);
  if (checkCmd !== null) {
    api.chat.say(`${aliasArg} cannot be used as an alias; it already resolves to ${checkCmd.name}`);
    return errReturn;
  }

  return [target, aliasArg, { aliases: [...target.aliases, aliasArg] }];
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

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[1]);

  // We already know this is a remove, so fetch the command that represents the
  // alias that we want to remove. Here we want to make sure that aliases are
  // allowed, since they are in fact required.
  const alias = getCmdTarget(api, cmd, nameArg, true, true);
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
  if (alias.name === nameArg) {
    api.chat.say(`${alias.name} is not an alias; it cannot be removed by this command`);
    return errReturn;
  }

  return [alias, nameArg, { aliases: alias.aliases.filter(name => name !== nameArg)}];
}


// =============================================================================


/* This command allows you to add or remove aliases for commands, which allows
 * you to execute the same command via multiple names, such as to use a shorter
 * version or to make a command known by more than one obvious name.
 *
 * The code here determines what action is being requested and then takes the
 * appropriate action by calling out to a helper. */
async function modify_cmd_aliases(api, cmd, userInfo) {
  // At a minimum, we need to receive at least one argument, which will tell us
  // what we're trying to do.
  if (cmd.words.length < 1) {
    return usage(api, cmd, '[add|remove] <command> [alias]', `add or remove aliases
      for a command; specify only a command name to view the aliases for that
      command`);
  }

  let target = undefined;
  let alias = undefined;
  let update = undefined;
  let postUpdate = undefined;

  // Gather all arguments.
  const opOrNameArg = cmd.words[0];
  switch(opOrNameArg) {
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

    // Deletes are known by more than one name as a fun easter egg, since there
    // are a few potential ways you might expect it to work.
    case 'rm':
    case 'delete':
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
      opOrNameArg = getValidCmdName(api, opOrNameArg)
      target = getCmdTarget(api, cmd, opOrNameArg, true, true);
      if (target === null) {
        return;
      }

      // Send out the display
      api.chat.say(_(`aliases for the ${target.name} command :
        ${(target.aliases.length === 0) ? 'none': target.aliases.join(',')}`));
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

  api.chat.say(_(`aliases for the ${target.name} command are now :
                 ${(target.aliases.length === 0) ? 'none': target.aliases.join(',')}`));
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

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[0]);
  let newFileArg = cmd.words[1] || nameArg;

  // Set up the name of the handler in the template file that we will be
  // generating (if adding to a brand new file). This is based on the name of
  // the command, with or without a prefix. It will be fixed below.
  let newHanderArg = `${nameArg}_command`;

  // Ensure that the command has a valid prefix; there's no helper call here. We
  // can leave immediately if such a command already exists.
  if (api.commands.find(nameArg) !== null) {
    api.chat.say(`unable to add new command ${nameArg}; a command by this name already exists`);
    return;
  }

  // The filename argument will be inferred from the new command name if it's
  // not given, but we need to make sure that the name doesn't have the command
  // prefix on it.
  while (isValidCmdName(newFileArg[0]) === true) {
    newFileArg = newFileArg.substr(1);
  }

  // Make sure that the name of the handler function that we came up with is a
  // valid identifier by removing any command prefix that it might have.
  while (isValidCmdName(newHanderArg[0]) === true) {
    newHanderArg = newHanderArg.substr(1);
  }

  // Include an extension on the file if one is missing.
  if (path.extname(newFileArg) === '') {
    newFileArg = `${newFileArg}.js`;
  }

  // If a path separator appears anywhere in the new source file, that's going
  // to be an issue, so kick it out.
  if (newFileArg.includes('/') || newFileArg.includes('\\')) {
    api.chat.say(`unable to add new command ${nameArg}; the implementation file must not have a path`);
    return;
  }

  // Determine the name of the file that this item will be implemented in, and
  // where we should get a stub from if we need to. The file has two names,
  // the one that's physical on the disk and the one that's relative and in
  // the database.
  const implFile = `command/${newFileArg}`;
  const srcFile = path.resolve(api.baseDir, 'extension/runtime/stubs/command.js');
  const dstFile = path.resolve(api.baseDir, `extension/runtime/${implFile}`);

  api.chat.say(`creating a new command ${nameArg} in ${implFile}`);

  // Start by adding a new entry to the database for this command and then add
  // a stub entry for it in the handler list so that we can get it to reload.
  await api.db.getModel('commands').create({
    name: nameArg,
    aliases: [],
    sourceFile: implFile,
    core: false,
    enabled: true,
    hidden: false
  });
  await api.commands.addItemStub(nameArg);

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
      // Using the incoming source file as a template, expand out the variables
      // in it to provide a directly usable stub for the new command.
      const templateData = await renderFile(srcFile, { command: {name: nameArg, handler: newHanderArg }});

      // Write the file to disk. The flag indicates that we should open the file
      // for appending, but fail if it already exists. This makes sure that when
      // adding a new item using an existing file, we don't clobber over
      // anything.
      api.log.info(`writeFileSync(${dstFile}, templateData, {flag: 'ax'})`);
      writeFileSync(dstFile, templateData, {flag: 'ax'});

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

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[0]);

  // Ensure that the command has a valid prefix; there's no helper call here. We
  // can leave immediately if the command doesn't already exist.
  const oldCmd = api.commands.find(nameArg);
  if (oldCmd === null) {
    api.chat.say(`unable to remove command ${nameArg} because it does not exist`);
    return;
  }

  // We don't want to allow removing an alias using this, so the command that's
  // looked up has to have the same name as the one the user specified.
  if (oldCmd.name !== nameArg) {
    api.chat.say(`unable to remove command ${nameArg} because it is an alias; did you mean ${oldCmd.name}?`);
    return;
  }

  // Make sure that we don't let anyone remove a core command, because that is a
  // recipe for disaster.
  if (oldCmd.core === true) {
    api.chat.say(`unable to remove command ${nameArg} because core commands can't be removed`);
    return;
  }

  api.chat.say(`removing command ${nameArg}`);

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
      '!addcommand': add_new_command,
      '!removecommand': remove_existing_command,

      '!enable': change_enabled_state,
      '!accesslevel': change_access_level,
      '!cooldown': change_cmd_cooldown,

      // This command specifically does not allow the enable command or its
      // aliases to be modified; change the code if we decide to change the
      // names that command is known by.
      '!alias': modify_cmd_aliases,
      '!cmdinfo': get_command_info
    };
  },

  unload: async api => {
  }
};
