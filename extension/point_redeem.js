// =============================================================================


async function addNewCustomRedeemHandler(api, title, redeemId) {
  // This does the work of adding a new entry into the channel point table that
  // will associate a redeem with the given title with a new handler, and set
  // as an alias the redeemId so that we can cross-examine and know which of
  // the custom redeems is which.
  api.log.info(`adding a new redeem: '${redeemId}' / '${title}'`);
}


// =============================================================================


async function removeOldCustomRedeemHandler(api, title, redeemId) {
  // This does the work of examining the list of existing redeems to find the
  // one that has the redeemId provided as an alias, and then removes it from
  // the list of redeems. This would remove the entry but leave the
  // implementation file alone.
  //
  // This should verify (but not require) that the title is the name of the
  // event.
  api.log.info(`removing a defunct redeem: '${redeemId}' / '${title}'`);
}


// =============================================================================


async function renameExistingRedeemHandler(api, title, redeemId) {
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


async function dispatchRedeemOperation(api, title, redeemId) {
  // Given the information about a particular redeem and it's ID, do a check to
  // see if this is an add, a remove or a rename and then invoke the appropriate
  // helper method on it in order to carry out the change.
  api.log.info(`Dispatching '${redeemId}' <=> ${title}`);
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
  // twitchItems.forEach(redeem => dispatchRedeemOperation(api, redeem.title, redeem.id));
  if (twitchItems === null) {
    api.log.warn(`unable to collect the list of custom channel point rewards`);
    return;
  }

  // Collect the list of known redeems from the database and normalize it into
  // objects with a title and id key, so that below regardless of where a record
  // came from, it will have the fields that we expect it to have.
  let dbItems = await api.db.getModel('channelpoints').find({});
  dbItems = dbItems.map(item => item ? { title: item.aliases[0], id: item.name} : {});
  // dbItems.forEach(redeem => dispatchRedeemOperation(api, redeem.title, redeem.id));

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
  const itemsToModify = dbItems.filter(({ id: id1 }) => twitchItems.some(({ id: id2 }) => id2 === id1) === true);

  // Trigger the addition and removal of channel point redeems as appropriate.
  // For items that are already in both, ensure that the names are up to date.
  //
  // The only information needed is the human readable title and the unique
  // twitch redeem ID.
  itemsToAdd.forEach(redeem => addNewCustomRedeemHandler(api, redeem.title, redeem.id))
  itemsToDelete.forEach(redeem => removeOldCustomRedeemHandler(api, redeem.title, redeem.id))
  itemsToModify.forEach(redeem => renameExistingRedeemHandler(api, redeem.title, redeem.id))
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
