'use strict';


// TODO:
//    - The command for setting up and editing text entries should have the
//      ability to change the userlevel and cooldown on a per entry basis, and
//      should respect that when invoked as an alias. Currently neither of those
//      things happen.


// =============================================================================


const { usage } = require('../../utils');


// =============================================================================



// $text add $name the text goes here
function add_text_response(api, cmd, userInfo) {
  return usage(api, cmd, 'add <name> <text>', `create a new response item with
    the given name which, when triggered, will say the specific text`);
}


// =============================================================================


// $text remove $name
function remove_text_response(api, cmd, userInfo) {
  return usage(api, cmd, 'remove <name>', `remove the response item with the
    given name`);
}


// =============================================================================


// $text edit $name the next text goes here
function edit_text_response(api, cmd, userInfo) {
  return usage(api, cmd, 'edit <name> <text>', `alter the text of an existing
    response item to the specific text`);
}


// =============================================================================


// $text link $name $linkedname
// $text unlink $name $linkedname
function modify_text_link(api, cmd, userInfo) {
    return usage(api, cmd, '[link|unlink] <name> [link]', `create a new responder
      that links to an existing responder and shares its text, or remove an
      existing link`);

}


// =============================================================================


// $text access $name <level>
function modify_text_access(api, cmd, userInfo) {
    return usage(api, cmd, 'access <name> <level>', `alter the user access level
      that is required to trigger the named autoresponder; with no level, view
      the currently set access level`);
}

// =============================================================================


// $text cooldown $name <period>
function modify_text_cooldown(api, cmd, userInfo) {
    return usage(api, cmd, 'cooldown <name> <period>', `alter the cooldown
      period between invocations of the named respoonder; with no period, view
      the currently set cooldown period`);
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
function generate_text_response(api, cmd, userInfo) {
  // If we got any arguments at all, dispatch based on what the selected
  // operation is. If none match, we fall through to the code that assumes no
  // arguments and describes overall usage.
  if (cmd.words.length !== 0) {
    switch (cmd.words[0]) {
      case 'add':
        return add_text_response(api, cmd, userInfo);

      case 'remove':
        return remove_text_response(api, cmd, userInfo);

      case 'edit':
        return edit_text_response(api, cmd, userInfo);

      case 'link':
        return modify_text_link(api, cmd, userInfo);

      case 'unlink':
        return modify_text_link(api, cmd, userInfo);

      case 'access':
        return modify_text_access(api, cmd, userInfo);

      case 'cooldown':
        return modify_text_cooldown(api, cmd, userInfo);
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
