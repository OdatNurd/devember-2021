
// =============================================================================


const { ClientCredentialsAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');


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
}


// =============================================================================


module.exports = setup_twitch_api;
