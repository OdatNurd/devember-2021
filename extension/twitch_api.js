
// =============================================================================


const { ClientCredentialsAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');

const { getAuthProvider } = require('./utils');


// =============================================================================


/* This handler gets called whenever the authorization state of one of the bot
 * accounts changes to be authorized. We use this to determine if it's time to
 * set up the API endpoint that represents the user in the channel so that we
 * can make requests as them or not. */
async function handleAuthEvent(api, info) {
  // If the event is a bot event, we don't care; we only need the authorization
  // of the user's account to set up a Twitch API for the user.
  if (info.type !== 'user') {
    return;
  }

  api.log.info('creating Twitch API endpoint for user data requests');

  // Get an authentication provider for the user's data, and the use that to
  // create a Twitch API client for the user. This allows for the request of
  // data that is user specific and for which we need to provide a user specific
  // token (as opposed to an app token for a client ID which the user has
  // authorized).
  const authProvider = await getAuthProvider(api, 'user');
  api.userTwitch = new ApiClient({ authProvider });
}


// =============================================================================


/* This handler gets called whenever the authorization state of one of the bot
 * accounts changes to be deauthorized. We use this to determine if it's time to
 * get rid of the API endpoint associated with our user because it's no longer
 * valid. */
function handleDeauthEvent(api, info) {
  // If the event is a bot event, we don't care; we only need the authorization
  // of the user's account to set up a Twitch API for the user.
  if (info.type !== 'user') {
    return;
  }

  api.log.info('removing Twitch API endpoint for user requests');

  // Get rid of the twitch user API endpoint by getting rid of the reference to
  // it; external code needs to check that this exists in order to make user
  // facing requests.
  api.twitchUser = undefined;
}


// =============================================================================


/* This sets up the Twitch API that is used to make all of our requests. This
 * is done using an App token, which is a token that is not associated with
 * any particular user at all.
 *
 * Some requests will require gathering information for or taking an action for
 * a particular user. For such requests, it's enough that at some point in the
 * past that user has authorized this application to do such things.
 *
 * That level of authorization is what happens in the Auth code when you set up
 * the bot account and the channel that the bot will run inside of.
 *
 * This includes elements in the API structure that is passed in to include the
 * Twitch API endpoint that we need:
 *    - api.twitch */
function setup_twitch_api(api) {
  api.log.info('Setting up the global twitch API endpoint');

  // App tokens are special; they can't be refreshed directly because you can
  // just ask for a new one at any time. So for these tokens we use a different
  // Auth provider that knows about that and can fetch tokens as needed.
  const authProvider = new ClientCredentialsAuthProvider(
    api.config.get('twitch.core.clientId'),
    api.config.get('twitch.core.clientSecret')
  );

  // Create a Twitch API instance from which we can make requests. This will
  // be tied to the app token. The app tokens are good for 60 days, so the
  // client provider may fetch a new one as needed.
  api.twitch = new ApiClient({ authProvider });

  // Listen for events that tell us when the authorization state of the various
  // accounts has completed, which is our signal to create or remove the API
  // endpoint for talking to Twitch as the user of the channel that the bot has
  // been authorized for.
  api.nodecg.listenFor('auth-complete',   info => handleAuthEvent(api, info));
  api.nodecg.listenFor('deauth-complete', info => handleDeauthEvent(api, info));
}


// =============================================================================


module.exports = setup_twitch_api;
