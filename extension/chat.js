'use strict';


// =============================================================================


const { ChatClient } = require('@twurple/chat');
const { RefreshingAuthProvider } = require('@twurple/auth');


// =============================================================================


/* Create a Twurple authorization object that wraps the token with the local
 * name given. Details required to refresh the token will be queried from the
 * database.
 *
 * The Twurple Auth provider is for using the Twurple libraries to do operations
 * on Twitch and it's API's, and they ensure that there is a token and that it
 * will refresh itself as needed if the app is long running. */
async function getAuthProvider(api, name) {
  api.log.info(`Fetching ${name} access token`);

  // If there is no record found for this token, we can't set up an Auth
  // provider for it.
  const model = api.db.getModel('tokens');
  const record = await model.findOne({ name });
  if (record === undefined) {
    return null;
  }

  // The Twurple library has an authorization object that can ensure that the
  // token is valid and up to date. Set up an appropriately shaped object from
  // the stored token data.
  const tokenData = {
    accessToken: api.crypto.decrypt(record.token),
    refreshToken: api.crypto.decrypt(record.refreshToken),
    scope: record.scopes,
    expiresIn: record.expiration,
    obtainmentTimestamp: record.obtained
  };

  // Create and return the auth provider.
  return new RefreshingAuthProvider(
    {
      clientId: api.config.get('twitch.core.clientId'),
      clientSecret: api.config.get('twitch.core.clientSecret'),
      onRefresh: async newData => {
        api.log.info(`Refreshing the ${name} token`);
        await model.update({ name }, {
          token: api.crypto.encrypt(newData.accessToken),
          refreshToken: api.crypto.encrypt(newData.refreshToken),
          scopes: newData.scopes,
          obtained: newData.obtainmentTimestamp,
          expiration: newData.expiresIn
        });
      }
    },
    tokenData
  );
}


// =============================================================================


/* This section sets up the core of the code used to authorize accounts with
 * Twitch using the OAuth2 flows, which require us to direct the browser to a
 * specific page on Twitch, where the user can choose to authorize.
 *
 * This requires some web endpoints on our end to negotiate the transfers as
 * well as some support code.
 *
 * This includes elements in the API structure that is passed in to include the
 * crypto endpoints that we need; these endpoints may at any point be undefined
 * if the appropriate authorizations have not been made or have been redacted;
 * thus anything that wants to use them needs to verify first:
 *    - api.chat */
async function setup_chat(api) {
  // Determine what channel the bot should join. This comes from the authorized
  // user channel record. If there isn't one, there's nothing that we can do.
  const channelInfo = await api.db.getModel('users').findOne({ type: 'user' });
  if (channelInfo === null) {
    api.log.warn('Cannot join chat; there is no authorized channel');
    api.chat = undefined;
    return;
  }

  // To join the channel, there needs to be a token associated with the bot so
  // that we can connect as them. If there is no such token, then we can't
  // continue. To determine that, we will get the authorization object that we
  // need later; this will return null if there is no such item.
  // Get an auth provider for the bot.
  const authProvider = await getAuthProvider(api, 'bot');
  if (authProvider === null) {
    api.log.warn('Cannot join chat; there is no authorized bot user');
    api.chat = undefined;
    return;
  }


  // We are now good to start up, so determine the username of the channel user
  // so that we can get a channel name out of it.
  const userInfo = await api.twitch.users.getUserById(channelInfo.userId);
  const channelName = '#' + userInfo.name;


  // Create a chat client using our authorized bot user, and store it into the
  // api.
  api.chat = new ChatClient({
    authProvider,
    channels: [channelName],
    botLevel: "none",   // "none", known" or "verified"
    isAlwaysMod: false,
  });

  // Whenever a message appears in the chat, display it to the console.
  api.chat.onMessage(async (channel, user, message, rawMsg) => {
    api.log.info(`${channel}:<${user}> ${message}`);
  });

  // Whenever an action appears in the chat, display it to the console.
  api.chat.onAction((channel, user, message) => {
    api.log.info(`${channel}:* ${user} ${message}`);
  });

  // Display a notification when the chat connects,.
  api.chat.onConnect(() => {
    api.log.info('** Twitch chat connection established');
  });


  // Display a notification when the chat disconnects.
  api.chat.onDisconnect((_manually, _reason) => {
    api.log.info('** Twitch chat disconnected');
  });

  // Handle a situation in which authentication of the bot failed; this would
  // happen if the bot user redacts our ability to talk to chat from within
  // Twitch without disconnecting in the app, for example.
  api.chat.onAuthenticationFailure(message => {
    api.log.error(`Authentication failed: ${message}`);
  });

  // As a part of the connection mechanism, we also need to tell the server what
  // name we're known by. Once that happens, this event triggers.
  api.chat.onRegister(() => {
    api.log.info(`** Registered with Twitch chat as ${api.chat.currentNick}`);
    api.chat.say(channelName, 'If we see this in the chat, it *MIGHT* be the end of the world as we know it.');
  });

  // Handle cases where sending messages fails due to being rate limited or
  // other reasons.
  api.chat.onMessageFailed((channel, reason) => api.log.error(`${channel}: message send failed: ${reason}`));
  api.chat.onMessageRatelimit((channel, message) => api.log.warn(`${channel}: rate limit hit; did not send: ${message}`));

  // We're done, so indicate that we're connecting to twitch.
  api.log.info(`** Connecting to Twitch chat in channel ${channelName}`);
  api.chat.connect();
}


// =============================================================================


module.exports = setup_chat;
