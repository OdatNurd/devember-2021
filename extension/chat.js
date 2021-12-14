'use strict';


// =============================================================================


const { ChatClient } = require('@twurple/chat');
const { RefreshingAuthProvider } = require('@twurple/auth');

const { getUserInfo } = require('./auth');


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


/* This handler gets called whenever the authorization state of one of the bot
 * accounts changes to be authorized. We use this to determine if it's time to
 * enter the chat with the bot or not, such as if we now have all of the
 * required authorizations. */
async function handleAuthEvent(api, type) {
  // Get information about the account that was just authorized; we need to know
  // this to know how to get into the channel for either of these users.
  const userInfo = await getUserInfo(api, type);
  if (userInfo === null) {
    api.log.warn(`unable to find ${type} information; cannot join chat`);
    return;
  }

  // If the account that just authorized is the user account, then we need to
  // look up the information for that user in order to know what channel the
  // bot is supposed to join.
  switch (type) {
    case 'user':
      // The name of the channel to join is based on the username of the user
      // whose channel it is.
      api.chat.channel = `#${userInfo.name}`;
      api.log.info(`Chat bot is authorized to join ${api.chat.channel}`)
      break;

    case 'bot':
      // Get an authorization object for the bot user; if this doesn't work then
      // we can't join the chat because we won't be able to authenticate
      // ourselves.
      api.chat.auth = await getAuthProvider(api, 'bot');
      if (api.chat.auth === null) {
        api.log.warn('unable to find authorized bot token; cannot join chat');
        api.chat.auth = undefined;
      } else {
        api.log.info(`Chat bot is running as ${userInfo.displayName}`);
      }
      break;

    default:
      api.log.error(`unhandled authorization event type ${type}`)
      break;
  }

  // If we have all of the required items, we can now join the chat. When we
  // do this, we need to make sure that we capture the return of the function,
  // which gives us all of the event handles we will need to use to cancel if
  // we want to leave the chat.
  if (api.chat.channel !== undefined && api.chat.auth !== undefined) {
    joinTwitchChat(api);
  }
}


// =============================================================================


/* This handler gets called whenever the authorization state of one of the bot
 * accounts changes to be deauthorized. We use this to determine if it's time to
 * leave the chat with the bot or not, which we would do as soon as an auth
 * drops, since all are required for the chat to function. */
function handleDeauthEvent(api, type) {
  // If we are currently in the chat, we need to leave it because the authorized
  // accounts are changing.
  if (api.chat.client !== undefined) {
    api.log.warn(`${api.chat.client.currentNick} is leaving ${api.chat.channel}`);
    leaveTwitchChat(api);
  }

  switch (type) {
    case 'user':
      api.log.warn(`Bot has been asked to leave ${api.chat.channel}`)
      api.chat.channel = undefined;
      break;

    case 'bot':
      api.log.warn(`Bot account has had its authorization revoked`);
      api.chat.auth = undefined;
      break;

    default:
      api.log.error(`unhandled deauthorization event type ${type}`)
      break;
  }
}


// =============================================================================


/* Attempt to join the Twitch chat based on the information we have on the
 * authorized accounts.
 *
 * This will silently do nothing if it is asked to join the chat while the chat
 * is already joined, or if the information required to do the join is not
 * actually present. */
async function joinTwitchChat(api) {
  // If we're already connected or don't have the info to do so, leave now.
  if (api.chat.client !== undefined ||
      api.chat.channel === undefined || api.chat.auth === undefined) {
    return;
  }

  // Create a chat client using our authorized bot user, and store it into the
  // api.
  const chat = new ChatClient({
    authProvider: api.chat.auth,
    channels: [api.chat.channel],
    botLevel: "none",   // "none", known" or "verified"
    isAlwaysMod: false,
  });

  // Store the chat client in our top level API, and make an alias for the
  // "say" to make life a little bit easier.
  api.chat.client = chat;
  api.chat.say = text => api.chat.client.say(api.chat.channel, text);

  // Set up all of the events that will tell us when things happen in the chat.
  // In order to be able to leave the chat, we need to be able to cancel all of
  // the events so that they don't hold a reference to the chat object.
  //
  // To do that we need to remove the listeners based on the return values of
  // the event creation code, so we store them all in an array so that we can
  // do that easier later.
  api.chat.listeners = [
    // Whenever a message appears in the chat, display it to the console.
    chat.onMessage(async (channel, user, message, rawMsg) => {
      api.log.info(`${channel}:<${user}> ${message}`);
    }),

    // Whenever an action appears in the chat, display it to the console.
    chat.onAction((channel, user, message) => {
      api.log.info(`${channel}:* ${user} ${message}`);
    }),

    // Display a notification when the chat connects,.
    chat.onConnect(() => {
      api.log.info('Twitch chat connection established');
    }),

    // Display a notification when the chat disconnects.
    chat.onDisconnect((_manually, _reason) => {
      api.log.info('Twitch chat has been disconnected');
    }),

    // Handle a situation in which authentication of the bot failed; this would
    // happen if the bot user redacts our ability to talk to chat from within
    // Twitch without disconnecting in the app, for example.
    chat.onAuthenticationFailure(message => {
      api.log.error(`Twitch chat Authentication failed: ${message}`);
    }),

    // As a part of the connection mechanism, we also need to tell the server what
    // name we're known by. Once that happens, this event triggers.
    chat.onRegister(() => {
      api.log.info(`Registered with Twitch chat as ${api.chat.client.currentNick}`);
    }),

    // Handle cases where sending messages fails due to being rate limited or
    // other reasons.
    chat.onMessageFailed((channel, reason) => api.log.error(`${channel}: message send failed: ${reason}`)),
    chat.onMessageRatelimit((channel, message) => api.log.warn(`${channel}: rate limit hit; did not send: ${message}`)),
  ];

  // We're done, so indicate that we're connecting to twitch.
  api.log.info(`Connecting to Twitch chat and joining channel ${api.chat.channel}`);
  await chat.connect();
}


// =============================================================================


/* Attempt to elave the Twitch chat. Generally this is done because the account
 * that is being used for the bot has been deauthorized, or the user has asked
 * the bot to leave their channel.
 *
 * This will silently do nothing if it's asked to leave the chat while the chat
 * is not actually connected. */
async function leaveTwitchChat(api) {
  // If we're not in the chat right now, we can leave without doing anything/
  if (api.chat.client === undefined || api.chat.listeners === undefined) {
    return;
  }

  // Actively leave the chat, and then remove all of of the listeners that are
  // associated with it so that we can remove the instance; otherwise they will
  // hold onto it's reference.
  api.chat.client.quit();
  for (const listener in api.chat.listeners) {
    api.chat.client.removeListener(listener);
  }

  // Clobber away the values that tell us that we're connected to the chat.
  api.chat.listeners = undefined;
  api.chat.client = undefined;
  api.chat.say = text => api.log.warn('cannot send text to chat; not currently connected');
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
 * endpoints needed to support chat; these endpoints may at any point be
 * undefined if the appropriate authorizations have not been made or have been
 * redacted; thus anything that wants to use them needs to verify first:
 *    - api.chat.auth      : the auth provider for the bot account
 *    - api.chat.channel   : the channel the bot should be in
 *    - api.chat.client    : the chat client instance
 *    - api.chat.listeners : the event listener handles for child events.
 *    - api.chat.say       : alias for easily sending chat messages */
async function setup_chat(api) {
  // Set up the top level namespace that we will store our chat API in. By
  // default the alias for sending text to chat is a log message that says that
  // there's no connection, so that external code can always try to send without
  // checking if desired.
  api.chat = {
    say: text => api.log.warn('cannot send text to chat; not currently connected')
  };

  // Listen for events that tell us when the authorization state of the various
  // accounts has completed, which is our signal to join or leave the chat.
  api.nodecg.listenFor('auth-complete',   type => handleAuthEvent(api, type));
  api.nodecg.listenFor('deauth-complete', type => handleDeauthEvent(api, type));

  // Other systems in the bot can ask us to say text in chat, so long as we
  // are connected. We do that by listening for a message that tells us to say
  // some text.
  api.nodecg.listenFor('say-in-chat', text => {
    if (text !== '') {
      api.chat.say(text);
    }
  });
}


// =============================================================================


module.exports = setup_chat;
