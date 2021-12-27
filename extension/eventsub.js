// =============================================================================


const { getUserInfo } = require('./auth');


// =============================================================================


/* This handler gets called whenever the authorization state of one of the bot
 * accounts changes to be authorized. We use this to determine if it's ok for
 * us to set up Twitch events.
 *
 * This will get invoked for all authorizations, but we only care about the user
 * account, since EventSub works at the channel level and will work even if
 * there is no authorized bot account for chat purposes. */
async function handleAuthEvent(api, info) {
  // If the event is a bot event, we don't care; we need the authorization of
  // the user's account to set up events in their channel.
  if (info.type !== 'user') {
    return;
  }

  api.log.info(`Setting up Twitch events for user ${info.userId}`)
}


// =============================================================================


/* This handler gets called whenever the authorization state of one of the bot
 * accounts changes to be deauthorized. We use this to determine if we should be
 * removing any events that we happen to be already listening for or not.
 *
 * This will get invoked for all authorizations, but we only care about the user
 * account, since EventSub works at the channel level and will work even if
 * there is no authorized bot account for chat purposes. */
async function handleDeauthEvent(api, info) {
  // If the event is a bot event, we don't care; we need the authorization of
  // the user's account to set up events in their channel.
  if (info.type !== 'user') {
    return;
  }

  api.log.info(`Removing Twitch events for user ${info.userId}`)
}

// =============================================================================


/* This sets up the Twitch EventSub integrations in the bot. This requires that
 * the configuration options for this have been set appropriately; otherwise
 * nothing will happen and the setup will silently do nothing.
 *
 * In action, this uses the Twurple libraries for EventSub to set up appropriate
 * listeners that allow Twitch to tell us when events happen for our channel.
 *
 * To work, this requires that the bot be authorized for a specific user's
 * channel; the events will be removed from the channel when the authorization
 * from the channel is revoked.
 *
 * This includes elements in the API structure that is passed in to include the
 * Twitch API endpoint that we need:
 *    - api.events.listener */
async function setup_twitch_eventsub(api) {
  // Set up the top level namespace that we will store our event API in. By
  // default, the listener is undefined; it will only be set up while we're
  // actually listening for events.
  api.events = {
    listener: undefined
  }

  // These values must be configured for the event system to listen for
  // events; if they're not present, then we should leave.
  const notificationUri = api.config.get('events.notificationUri');
  const serverPort = api.config.get('events.serverPort');
  const signingSecret = api.config.get('events.signingSecret');

  if (notificationUri === '' || serverPort === '' || signingSecret === '') {
    api.log.warn('Twitch EventSub is turned off; configure events to enable it');
    return;
  }

  api.log.info(`Twitch EventSub enabled; delivering from https://${notificationUri} to http://localhost:${serverPort}`);

  // Listen for events that tell us when the authorization state of the various
  // accounts has completed, which is our signal to either set up or revoke our
  // event listeners.
  api.nodecg.listenFor('auth-complete',   info => handleAuthEvent(api, info));
  api.nodecg.listenFor('deauth-complete', info => handleDeauthEvent(api, info));
}


// =============================================================================


module.exports = setup_twitch_eventsub;
