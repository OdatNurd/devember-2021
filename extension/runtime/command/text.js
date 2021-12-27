
// =============================================================================


const { usage, getValidCmdName, persistItemChanges,
        cooldownToString, stringToCooldown,
        userLevelToString, stringToUserLevel, getDisplayAccessLevels } = require('../../utils');



// =============================================================================


/* This handles the addition of a new text responder by making sure that an
 * unused response name is given, along with some text. It will make sure that
 * the table is updated as appropriate and then make sure that the new entry is
 * available for immediate use. */
async function add_text_response(api, cmd, userInfo) {
  // We know that this is an add operation but we need to be given the name of
  // the new item and at least one word of text.
  if (cmd.words.length < 3) {
    return usage(api, cmd, 'add <name> <text>', `create a new response item with
      the given name which, when triggered, will say the specific text`);
  }

  // Collect our arguments
  let [opArg, nameArg, ...textArg] = cmd.words;
  nameArg = getValidCmdName(api, nameArg);

  // If the name given is already in the list of responders, we can't add one
  // because it would clash.
  if (api.responders.find(nameArg) !== null) {
    api.chat.say(`unable to add a new responder for ${nameArg}; an item by this name already exists`);
    return;
  }

  // Get the text that the responder will respond with; this is all unused words
  // in the original input.
  const responseText = textArg.join(' ');
  api.chat.say(`creating a new text response named ${nameArg} => '${responseText}'`);

  // Add the new entry to the database and then get the handler list to add the
  // stub, which will bring the item into the list for us.
  await api.db.getModel('responders').create({
    name: nameArg,
    aliases: [],
    text: responseText
  })
  await api.responders.addItemStub(nameArg);
}


// =============================================================================


/* This handles the removal of a text responder by making sure that the name
 * given is a responder that exists and is not an alias. It will make sure that
 * the entry is removed from the database and that the internal list is also
 * updated. */
async function remove_text_response(api, cmd, userInfo) {
  // We know that this is a remove operation but we need to be given the name of
  // the item to remove.
  if (cmd.words.length < 2) {
    return usage(api, cmd, 'remove <name>', `remove the response item with the
      given name`);
  }

  // Collect our arguments
  const nameArg = getValidCmdName(api, cmd.words[1]);

  // Look up the entry for the item that we want to remove. This has to exist
  // or we can't remove it.
  const item = api.responders.find(nameArg);
  if (nameArg === null) {
    api.chat.say(`unable to remove responder ${nameArg} because it does not exist`);
    return;
  }

  // If the item is an alias for something else, we can't remove it; there's a
  // distinct command that handles that.
  if (nameArg !== item.name) {
    api.chat.say(`unable to remove responder ${nameArg} because it is an alias; did you mean ${item.name}?`);
    return;
  }

  // We can remove the item now
  api.chat.say(`removing responder ${nameArg}`);

  // Remove the item from the database, and then remove all traces of it from
  // the internal list as well.
  await api.db.getModel('responders').remove({ id: item.id });
  api.responders.remove(nameArg);
}


// =============================================================================


/* This handles editing the text associated with a specifically named responder
 * by updating the database and also the entry that has already been loaded from
 * the database. This ensures that the item to be edited exists and is not an
 * alias for some other responder. */
async function edit_text_response(api, cmd, userInfo) {
  // We know that this is an edit operation but we need to be given the name of
  // the item to edit and at least one word of text to change the item to.
  if (cmd.words.length < 3) {
    return usage(api, cmd, 'edit <name> <text>', `alter the text of an existing
      response item to the specific text`);
  }

  // Collect our arguments
  let [opArg, nameArg, ...textArg] = cmd.words;
  nameArg = getValidCmdName(api, nameArg);

  // If the name given is not in the list of responders, we can't edit it.
  const item = api.responders.find(nameArg);
  if (item === null) {
    api.chat.say(`unable to edit responder ${nameArg} because it does not exist`);
    return;
  }

  // If the item is an alias for something else, we can't edit it
  if (nameArg !== item.name) {
    api.chat.say(`unable to edit responder ${nameArg} because it is an alias; did you mean ${item.name}?`);
    return;
  }

  // Get the text that the responder will respond with; this is all unused words
  // in the original input.
  const responseText = textArg.join(' ');
  api.chat.say(`editing the response for ${nameArg} => '${responseText}'`);

  // Update the database entry for this, and hot-patch the new data directly
  // into the loaded instance.
  await persistItemChanges(api, 'responders', item, { text: responseText });
}


// =============================================================================


// $text link $name $linkedname
// $text unlink $name $linkedname
async function modify_text_link(api, cmd, userInfo) {
    return usage(api, cmd, '[link|unlink] <name> [link]', `create a new responder
      that links to an existing responder and shares its text, or remove an
      existing link`);

}


// =============================================================================


/* This modifies the access level required in order to trigger the provided
 * text responder. This operation requires that the responder exists, but allows
 * you to modify the access for a responder through a link. */
async function modify_text_access(api, cmd, userInfo) {
  // The levels we use in our display here; the actual values supported is a
  // much larger list, to make commands more natural.
  const levels = getDisplayAccessLevels();

  // We need to be given a responder name.
  if (cmd.words.length < 1) {
    return usage(api, cmd, 'access <name> [${levels.join('|')}]', `alter the user
      access level that is required to trigger the named autoresponder; with no
      level, view the currently set access level`);
  }

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[1]);
  const intervalArg = cmd.words[2];

  // If the name given is not in the list of responders, we can't edit it.
  const item = api.responders.find(nameArg);
  if (item === null) {
    api.chat.say(`unable to edit responder ${nameArg} because it does not exist`);
    return;
  }

  // If there is only a responder name provided, then display the current access
  // level for this item and we can leave.
  if (cmd.words.length === 2) {
    api.chat.say(`the access level for ${item.name} is currently set to ${userLevelToString(item.userLevel)}`);
    return;
  }

  // Look up the appropriate user level based on the argument provided.
  const userLevel = stringToUserLevel(levelArg);
  if (userLevel === undefined) {
    api.chat.say(`${levelArg} is not a valid access level; valid levels are: ${levels.join(',')}`);
    return;
  }

  // Update the command with the changes, then report them.
  await persistItemChanges(api, 'responders', item, { userLevel });
  api.chat.say(`the access level for ${item.name} has been set to ${userLevelToString(userLevel)}`);
}

// =============================================================================


/* This modifies the access level required in order to trigger the provided
 * text responder. This operation requires that the responder exists, but allows
 * you to modify the access for a responder through a link. */
async function modify_text_cooldown(api, cmd, userInfo) {
  // The possible formats for times that we use in our display here; the actual
  // values are parsed from user input in this style.
  const specs = ['##.#s', '##.#m', '##.#h'];

  // We need to be given a responder name.
  if (cmd.words.length < 1) {
    return usage(api, cmd, 'cooldown <name> <period>', `alter the cooldown
      period between invocations of the named respoonder; with no period, view
      the currently set cooldown period`);
  }

  // Gather all arguments.
  const nameArg = getValidCmdName(api, cmd.words[1]);
  const intervalArg = cmd.words[2];

  // If the name given is not in the list of responders, we can't edit it.
  const item = api.responders.find(nameArg);
  if (item === null) {
    api.chat.say(`unable to edit responder ${nameArg} because it does not exist`);
    return;
  }

  // If there is only a responder name provided, then display the current
  // cooldown for this item and we can leave.
  if (cmd.words.length === 2) {
    const curCool = (item.cooldown === 0) ? 'no cool down' :
                     `a cool down of ${cooldownToString(item.cooldown)}`;

    api.chat.say(`the cool down timer for ${item.name} is currently set to ${curCool}`);
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

  // Update the responder with the changes, then report them.
  await persistItemChanges(api, 'responders', item, { cooldown });
  api.chat.say(`the cool down time for ${item.name} has been set to ${newCool}`);
}


// =============================================================================


/* This single command encompasses all of the functionality for setting up
 * predefined bot responses. There is a database table which contains the
 * entries that are used in the response system, and this command allows for
 * editing the contents of that table.
 *
 * This is done by having a single command "overload" all of the potential
 * operations, which it will dispatch out to the other handlers above. Some of
 * these mimic similar options that are used by the command code to handle
 * similar operations. */
async function generate_text_response(api, cmd, userInfo) {
  // If we got any arguments at all, dispatch based on what the selected
  // operation is. If none match, we fall through to the code that assumes no
  // arguments and describes overall usage.
  if (cmd.words.length !== 0) {
    switch (cmd.words[0]) {
      case 'add':
        return await add_text_response(api, cmd, userInfo);

      case 'remove':
        return await remove_text_response(api, cmd, userInfo);

      case 'edit':
        return await edit_text_response(api, cmd, userInfo);

      case 'link':
        return await modify_text_link(api, cmd, userInfo);

      case 'unlink':
        return await modify_text_link(api, cmd, userInfo);

      case 'access':
        return await modify_text_access(api, cmd, userInfo);

      case 'cooldown':
        return await modify_text_cooldown(api, cmd, userInfo);
    }
  }

  return usage(api, cmd, '<add|remove|link|unlink|access|cooldown> <name>', `manipulate the
    list of auto-response entries in the system; invoke with a single argument
    to get more specific instructions`);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      '$text': generate_text_response,
    };
  },

  unload: async api => {
  }
};
