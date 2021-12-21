'use strict';


// TODO:
//    - The command for setting up and editing text entries should have the
//      ability to change the userlevel and cooldown on a per entry basis, and
//      should respect that when invoked as an alias. Currently neither of those
//      things happen.


// =============================================================================


const { usage } = require('../../utils');


// =============================================================================


/* Do a check against the effective userlevel of the passed in user and see if
 * it meets or exceeds the permission level passed in. The return value
 * indicates if the access level is sufficient or not. */
function checkAccess(api, userInfo, requiredLevel) {
  const effectiveLevel = api.getUserLevel(api, userInfo);
  return effectiveLevel <= requiredLevel;
}


// =============================================================================


/* When the command is executed under it's native name (i.e. not as an alias),
 * this is invoked to handle the execution of the command.
 *
 * This version of the command requires specific user privilege and is used to
 * set up, edit and remove entries from the auto response table. */
async function handle_admin(api, cmd, userInfo) {
  // In order to run the admin side, you need to be at least a mod.
  if (checkAccess(api, userInfo, 1) === false) {
    api.log.warn(`-> ${cmd.name} cannot execute; access denied`);
    return;
  }

  // $text add $name the text goes here
  // $text remove $name
  // $text link $name $linkedname
  // $text edit $name the next text goes here
  // $text view $name
  if (cmd.words.length === 0) {
    return usage(api, cmd, '<add|remove|link|edit|view> <newName>', `manipulate the
      list of auto-response entries in the system; invoke with a single argument
      to get more specific instructions`)
  }

  // This needs to make sure that the aliases used don't conflict with any other
  // commands that might exist.

  api.chat.say(`whatever you're trying to do, it's not implmented yet; sorry.`);
}


// =============================================================================


/* When the command is invoked via an aliased name, this is invoked to handle
 * execution of the command.
 *
 * This version uses the name of the alias to look up an entry in the database
 * to see what text it should output, and then says that if found.
 *
 * This version of the command gets the user permissions and the cooldown time
 * from the associated entry in the database, and will respect those on its
 * own, since the overall command entry has more specific information that that
 * allows it to be executed by everyone always. */
async function handle_alias(api, cmd, userInfo) {
  // Look up the entry in the response table that corresponds to the alias that
  // we were invoked with.
  const model = api.db.getModel('responses');
  let record = await model.findOne({ name: cmd.name });

  // If we found a record, but it has a non-zero link, then we need to look
  // again to find the linked record so we can use that one to continue.
  if (record !== undefined && record.link !== 0) {
    record = await model.findOne({ id: record.link });
  }

  // If we don't have a record, then either the original lookup failed, or it
  // linked to a record that doesn't exist. Also, if we DO have a record but it
  // has a non-zero link field, then the table is trying to link a link to
  // another link (say that five times fast).
  //
  // In all of these cases, we can't continue.
  if (record === undefined || record.link !== 0) {
    api.chat.say(`I can't do that, Dave. Because Dave's not here, man.`);
    api.log.error(`While invoking text alias ${cmd.name}, could not find the text or the DB has too many links`);
    return;
  }

  // We have a record, so make sure that the current user's access level can be
  // used to invoke this; otherwise, just leave.
  if (checkAccess(api, userInfo, record.userLevel) === false) {
    api.log.warn(`-> ${cmd.name} cannot execute; access denied`);
    return;
  }

  // Check in our local cooldown table to see if it's time to allow this command
  // to run or not; the cooldown value comes from the looked up record (which
  // might be a linked record)
  const effectiveLevel = api.getUserLevel(api, userInfo);

  // If there is a cool down currently in effect and it has not been
  // exceeded yet, the command cannot execute.
  //
  // The cool down does not apply to the broadcaster or to moderators, who
  // should always have the ability to access a command.
  const lastRun = api.shared.responder_lastRun[cmd.name] ?? null;
  if (record.cooldown !== 0 && effectiveLevel > 1 && new Date().getTime() - (lastRun ?? 0) < record.cooldown) {
    api.log.warn(`-> ${cmd.name} cannot execute; in cool down`);
    return;
  }

  // Store this as the last run time.
  api.shared.responder_lastRun[cmd.name] = new Date().getTime();

  // This user can run the command, so get the bot to say the text.
  api.chat.say(record.text);
}


// =============================================================================


/* This command works in multiple ways:
 *
 * When invoked as it's core name, it allows the the user to manipulate and view
 * the contents of the auto response table, setting up predefined segments of
 * text that the bot can say.
 *
 * When invoked as an alias, it will use the name it was invoked with to find
 * the entry in the response table that matches and say the text into the chat.
 *
 * Both of these operations have different levels of permissions required as
 * well as different senses of cooldown time. So the command itself is set up to
 * be invoked by everyone with no cooldown, and has to synthesize that itself.
 *
 * This is an example of a command being able to do anything it likes in
 * response to being invoked, including making up its own rules on when it can
 * be executed. */
function generate_text_response(api, cmd, userInfo) {
  // NOTES:
  //    In the DB, this command is access level 5 with a cooldown of 0 so its
  //    up to the command to do it's own local access control here in relation
  //    to its arguments and make sure that only appropriate users can access
  //    things as appropriate.
  if (cmd.isAlias === true) {
    handle_alias(api, cmd, userInfo);
  } else {
    handle_admin(api, cmd, userInfo);
  }
}


// =============================================================================


module.exports = {
  load: async api => {
    // Set up a shared table to track the last time anyone executed one of the
    // text commands. In this table the key is the name of the responder that
    // was last executed and the value is the last time it was run.
    api.shared.responder_lastRun = {}

    return {
      '$text': generate_text_response,
    };
  },

  unload: async api => {
    // Clean up our shared table
    api.shared.responder_lastRun = undefined;
  }
};
