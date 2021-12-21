'use strict';


// =============================================================================


const os = require('os');
const path = require('path');
const { existsSync, copyFileSync, constants } = require('fs');

const { CommandParser } = require('../../core/command');
const { usage } = require('../../utils');


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
    while (CommandParser.VALID_PREFIX_LIST.indexOf(newSrcFile[0]) !== -1) {
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
  if (CommandParser.VALID_PREFIX_LIST.indexOf(newCmdName[0]) === -1) {
    newCmdName = `${CommandParser.VALID_PREFIX_LIST[0]}${newCmdName}`;
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
    };
  },

  unload: async api => {
  }
};
