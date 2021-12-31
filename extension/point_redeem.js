// =============================================================================


const os = require('os');
const path = require('path');
const { existsSync, writeFileSync } = require('fs');

const { renderFile } = require('template-file');
const sanitize = require('sanitize-filename');


// =============================================================================


/* This will use the information passed in to come up with a unique name for a
 * particular redeem that combines all of the given information.
 *
 * This is required because although Twitch ensures that no two redeems can
 * share a name in a channel, it's possible for channels to share names.
 *
 * Since the bot can run in potentially more than one channel, this is needed to
 * ensure that there is never a collision in names.
 *
 * This is intelligent enough to not mark up a title that has already been
 * marked up using this function on a previous call. */
function makeEntryTitle(title, userId) {
  const trailer = ` [${userId}]`;

  return title.endsWith(trailer) ? title :  `${title}${trailer}`;
}


// =============================================================================


/* This gets the human readable name for a channel point redeem item that has
 * come from the database.
 *
 * Unlike commands and events where the main name field in the record is the
 * name, for channel point redeems the main name is the UUID of the redeem, and
 * the human name is actually the first alias.
 *
 * Given a database record for a channel point redeem, this will return the
 * name of that item. */
function getHumanName(item) {
  return (item.aliases.length === 0) ? 'unknown' : item.aliases[0];
}


// =============================================================================


/* This helper handles the case where there's a potential new addition of a
 * channel point redeem on the channel that the bot is currently connected to,
 * and can be called either at startup while the list of redeems is being synced
 * or at runtime in response to an event telling us that a new redeem is being
 * added.
 *
 * This will ensure that there is no collision with any existing items and will
 * generate a stub file, update the database and make the new entry immediately
 * reload the new file to bring the change into effect. */
async function addNewCustomRedeemHandler(api, broadcasterId, title, redeemId) {
  api.log.info(`adding a new channel point redeem: '${redeemId}' / '${title}'`);

  // Get the entry title that we'll be putting into the database.
  const entryTitle = makeEntryTitle(title, broadcasterId);

  // Create a filename out of the entry title by replacing spaces, adding an
  // extension and sanitizing it. If the result is not a valid filename, then
  // this falls back to using the redeem id as the filename to remind you to
  // make better life choices when naming things.
  let entryFilename = sanitize(`${entryTitle.replace(/ /g, '_')}.js`);
  if (entryFilename === '') {
    entryFilename = redeemId;
  }

  // Create a name that the function that implements this will be known by.
  // This is based on the entry title but redacts characters that are not valid
  // in an identifier.
  const entryHandler = title.replace(/([^A-Za-z0-9[\]{}_.:-])\s?/g, '');

  // Check to see if there's already an item with the redeem ID that we're
  // seeing here; if so, ignore this call since we only do additions and not
  // updates.
  let existing = api.channelpoints.find(redeemId);
  if (existing !== null) {
    api.log.warn(`an entry for '${redeemId}' already exists (${getHumanName(existing)}); cannot add`);
    return;
  }

  // Check to see if the title we're trying to use for this new item already
  // exists and similarly complain.
  exisiting = api.channelpoints.find(entryTitle);
  if (existing !== null) {
    api.log.warn(`an entry with the name '${entryTitle} already exists (${exisiting.name}); cannot add`);
    return;
  }

  // Determine the name of the file that this item will be implemented in, and
  // where we should get a stub from if we need to. The file has two names,
  // the one that's physical on the disk and the one that's relative and in
  // the database.
  const implFile = `channelpoint/${entryFilename}`;
  const srcFile = path.resolve(api.baseDir, 'extension/runtime/stubs/channelpoint.js');
  const dstFile = path.resolve(api.baseDir, `extension/runtime/${implFile}`);

  api.log.info(`adding a new redeem '${entryTitle}' in '${entryFilename}'`);

  // Start by adding a new entry to the database for this redeem and then add
  // a stub entry for it in the handler list so that we can get it to reload.
  await api.db.getModel('channelpoints').create({
    name: redeemId,
    aliases: [entryTitle],
    sourceFile: implFile,
    enabled: true,
  });
  await api.channelpoints.addItemStub(redeemId);

  // If the file already exists, then we can just get the handler list to
  // reload it; otherwise, we need to take extra steps to get the initial load
  // to happen.
  if (existsSync(dstFile)) {
    // If this implementation file has previously been loaded, then reload
    // it now, otherwise we need to do a fresh load because although the
    // file exists on disk, no commands are currently loaded from it.
    if (api.channelpoints.sources().indexOf(implFile) === -1) {
      api.channelpoints.loadNewFile(implFile);
    } else {
      api.channelpoints.reload([implFile], false);
    }
  } else {
    try {
      // Using the incoming source file as a template, expand out the variables
      // in it to provide a directly usable stub for the new redeem.
      const templateData = await renderFile(srcFile, {
        redeem: {
          title: entryTitle,
          id: redeemId,
          handler: entryHandler
        }
      });

      // Write the file to disk. The flag indicates that we should open the file
      // for appending, but fail if it already exists. This makes sure that when
      // adding a new item using an existing file, we don't clobber over
      // anything.
      api.log.info(`writeFileSync(${dstFile}, templateData, {flag: 'ax'})`);
      writeFileSync(dstFile, templateData, {flag: 'ax'});

      // Tell the channel point system to load a new file
      api.channelpoints.loadNewFile(implFile);
    } catch (err) {
      api.chat.say(`there was an error while putting the stub redeem file in place; please check the console`);
      api.nodecg.sendMessage('set-chan-log', `${err}\n${err.stack}`);
    }
  }
}


// =============================================================================


/* This helper handles the case where there's potentially an old channel point
 * redeem in the database but it's not in the channel that the bot is currently
 * connect to, and can be called either at startup while the list of redeems
 * is being synced or at runtime in response to an event telling us that an
 * existing redeem has been removed.
 *
 * This will ensure that an item with the ID passed in actually exists, and will
 * remove it from the database if so. The file that contains the handler will
 * be left alone so that it can be reconnected later as desired. */
async function removeOldCustomRedeemHandler(api, broadcasterId, title, redeemId) {
  api.log.info(`removing a defunct redeem: '${redeemId}' / '${title}'`);

  // Try to find an entry in the channel points list for this particular ID. If
  // there isn't one found, then we don't need to do anything because the entry
  // is already gone.
  const redeem = api.channelpoints.find(redeemId);
  if (redeem === null) {
    api.log.warn(`an entry for '${redeemId}' does not exist; cannot remove`);
    return;
  }

  // We found an item; if it's name is not the ID value that we looked it up as,
  // then somehow while deleting we got a redeem ID that was aliased to some
  // other one. In that case do nothing because we would be removing the wrong
  // entry.
  if (redeem.name !== redeemId) {
    api.log.warn(`the found entry for '${redeemId}' is an alias for '${redeem.name}' ; cannot remove`);
    return;
  }

  // To get rid of the redeem, we need to remove it from the database; we can
  // then tell the reloader to reload the file that it's contained inside of,
  // and it will notice that the entry is gone and remove it from the lists.
  await api.db.getModel('channelpoints').remove({ id: redeem.id });
  api.channelpoints.reload([redeem.name], true);
}


// =============================================================================


async function renameExistingRedeemHandler(api, broadcasterId, title, redeemId) {
  // This does the work of finding the item in the list whose redeem ID matches
  // the one that's passed in, and then renames the entry in the database to
  // match what the new title is.
  //
  // In doing this, the implementation file will no longer be set up to provide
  // the appropriate handler, so it will be up to the user to manually fix the
  // file in the online editor and then do a reload.
  api.log.info(`updating a redeem: '${redeemId}' / '${title}'`);
}


// =============================================================================


/* This handler gets called whenever the authorization system tells us that the
 * user token backed Twitch API endpoint has been successfully initialized,
 * allowing us to kick off any operations that require that API in order to
 * function. */
async function handleAuthEvent(api, info) {
  api.log.info('synchronizing channel point redemptions with Twitch');

  // Using the Twitch API for the channel's user, request a list of all of the
  // known channel point redeems that are currently available.
  const twitchItems = await api.userTwitch.channelPoints.getCustomRewards(info.userId);
  if (twitchItems === null) {
    api.log.warn(`unable to collect the list of custom channel point rewards`);
    return;
  }

  // Collect the list of known redeems from the database and normalize it into
  // objects with a title and id key, so that below regardless of where a record
  // came from, it will have the fields that we expect it to have.
  let dbItems = await api.db.getModel('channelpoints').find({});
  dbItems = dbItems.map(item => item ? { title: item.aliases[0], id: item.name} : {});

  // Compare the two lists to see which items appear in one but not in the
  // other. Array.some() will indicate if there's at least one item in the array
  // that matches, so combined with a filter we can grab any items out of one
  // list that don't appear in the other.
  //
  // Items that exist in the database but not on twitch are redeems that should
  // be removed from our records, while items that exist on twitch but not in
  // the database are items that we should be adding in.
  //
  // Any items that appear in both lists won't appear in either of these two
  // arrays when the filters are complete.
  const itemsToDelete = dbItems.filter(({ id: id1 }) => twitchItems.some(({ id: id2 }) => id2 === id1) === false);
  const itemsToAdd = twitchItems.filter(({ id: id1 }) => dbItems.some(({ id: id2 }) => id2 === id1) === false);

  // The inverse of the above, this finds items that exist with the same id in
  // both lists, which  becomes the list of items that may potentially have
  // different names and thus may require a rename to keep themselves in sync
  // with Twitch.
  const itemsToModify = twitchItems.filter(({ id: id1 }) => dbItems.some(({ id: id2 }) => id2 === id1) === true);

  // Trigger the addition and removal of channel point redeems as appropriate.
  // For items that are already in both, ensure that the names are up to date.
  //
  // The only information needed is the human readable title and the unique
  // twitch redeem ID.
  itemsToDelete.forEach(redeem => removeOldCustomRedeemHandler(api, info.userId, redeem.title, redeem.id))
  itemsToAdd.forEach(redeem => addNewCustomRedeemHandler(api, info.userId, redeem.title, redeem.id))
  itemsToModify.forEach(redeem => renameExistingRedeemHandler(api, info.userId, redeem.title, redeem.id))
}


// =============================================================================


/* This handler gets called whenever the authorization system tells us that the
 * user who authorized the bot for their channel has revoked their authorization
 * and as such we can no longer use the Twitch API on their behalf. */
function handleDeauthEvent(api, info) {
  api.log.info('stopping channel point redemption synchronization with Twitch');
}


// =============================================================================


/* The bot has the ability to automatically set up channel point redemptions as
 * they are added to the channel and remove them when they're removed.
 *
 * This module sets up an initial synchronization whenever the Twitch API for
 * the user's token is intialized, which allows us to find channel point redeems
 * that we didn't previously know about and remove any that no longer exist on
 * the channel.
 *
 * This doesn't add any modifications to the passed in API and only triggers
 * code when the authorization state changes. */
function setup_point_redeems(api) {
  api.log.info('Setting up the channel point redeem monitor');

  // Listen for events that tell us when the authorization state of the various
  // accounts has completed, which is our signal to create or remove the API
  // endpoint for talking to Twitch as the user of the channel that the bot has
  // been authorized for.
  api.nodecg.listenFor('setup-api-complete',   info => handleAuthEvent(api, info));
  api.nodecg.listenFor('shutdown-api-complete', info => handleDeauthEvent(api, info));
}


// =============================================================================


module.exports = {
  setup_point_redeems,
  addNewCustomRedeemHandler,
  removeOldCustomRedeemHandler,
  renameExistingRedeemHandler
}
