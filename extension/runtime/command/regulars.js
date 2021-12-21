'use strict';


// =============================================================================


const { usage } = require('../../utils');


// =============================================================================


/* This command allows for the easy addition or removal of regular users, which
 * are users that have special command permissions that are greater than those
 * of casual viewers, since a regular viewer is more trust worthy.
 *
 * This simply takes a command (add or remove) as well as a list of 1 or more
 * people, and updates the database as appropriate. */
async function modify_regulars(api, cmd, userinfo) {
  // We require two arguments minimum, and the first one needs to be the
  // command to do something with.
  if (cmd.words.length < 2 || ['add', 'remove'].indexOf(cmd.words[0]) === -1) {
    return usage(api, cmd, '<add/remove> <username list>', `add or remove regulars
      from the list of regular users`);
  }

  // Get the model that we're going to update
  const model = api.db.getModel('regulars');

  // Track whether we're adding or removing users.
  const addNew = (cmd.words[0] === 'add');

  // For each user provided, look them up and then either add or remove from
  // the database as needed.
  let modified = 0;
  let unknown = [];
  for (let i = 1; i < cmd.words.length; i++) {
    // Get the user (discarding leading prefix if needed), then look up the
    // information on that user.
    const user = (cmd.words[i][0] === '@' ? cmd.words[i].substr(1) : cmd.words[i]);
    const userDetails = await api.twitch.users.getUserByName(user);

    // Keep track of users we don't know so we can generate a message later.
    if (userDetails === null) {
      unknown.push(user);
      continue;
    }

    // Count this as a modification.
    modified++;

    const userRecord = {
      userId: userDetails.id,
      userName: userDetails.name,
      displayName: userDetails.displayName
    };

    // Update the database to include or not include this record; we
    // also want to adjust the cached version loaded at startup.
    if (addNew) {
      await model.create(userRecord);
      api.shared.regulars.set(userRecord.userId, userRecord);
    } else {
      await model.remove({ userId: userRecord.userId });
      api.shared.regulars.delete(userRecord.userId);
    }
  }

  // Say how many items were added or removed
  if (modified !== 0) {
    api.chat.say(`${addNew ? 'added' : 'removed'} ${modified} regular user(s)`);
  }

  // If any lookups failed, let the user know
  if (unknown.length !== 0) {
    api.chat.say(`check spelling? unable to look up: ${unknown.join(', ')}`)
  }
}


// =============================================================================


module.exports = {
  load: async api => {
    // Fetch the current list of regulars out of the database and put it
    // into the shared portion of the API so that everything can access it.
    const model = api.db.getModel('regulars');
    const users = await model.find({});

    // Create a map in the shared portion of the API for regulars; this will
    // be keyed by the Twitch userId of each regular, and store an object
    // that contains the other information.
    //
    // This is kept up to date at runtime as commands modify the list of
    // regulars.
    api.shared.regulars = new Map();
    for (const user of users) {
      api.shared.regulars.set(user.userId, user);
    }

    return {
      '$regulars': modify_regulars,
    };
  },

  unload: async api => {
    // Leave the list of regulars alone here; if the command reloads, it will
    // be reloaded anyway. In the interim the existing list can be used to
    // access control things.
    //
    // It would be save to remove it here; the access level checks will silently
    // not check for regular status if the map is missing.
  }
};
