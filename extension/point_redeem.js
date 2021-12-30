// =============================================================================


/* This handler gets called whenever the authorization system tells us that the
 * user token backed Twitch API endpoint has been successfully initialized,
 * allowing us to kick off any operations that require that API in order to
 * function. */
async function handleAuthEvent(api, info) {
  api.log.info('synchronizing channel point redemptions with Twitch')
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


module.exports = setup_point_redeems;
