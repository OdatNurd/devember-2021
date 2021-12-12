'use strict';

// =============================================================================

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const { RefreshingAuthProvider, getTokenInfo } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');

// =============================================================================

/* When we authorize with Twitch to get a token that allows us to take actions,
 * we need to go to a specific Twitch URL; that URL will prompt the user and
 * then direct the browser back to us to tell us the result and allow uas to
 * continue.
 *
 * This code will construct and return a parameter based on the passed in state,
 * which is an opaque data item that we can use to verify that the response we
 * get back is from the place that we expect (and thus it always changes). */
function getAuthURL(api, type, state) {
  const params = {
    client_id: api.config.get('twitch.core.clientId'),
    redirect_uri: api.config.get(`twitch.core.${type}CallbackURL`),
    force_verify: true,
    response_type: 'code',
    scope: 'user:read:email',
    state
  };

  return `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams(params)}`;
}

// =============================================================================

/* The flow of Twitch authentication is that we direct the browser to a specific
 * page, which will prompt the user to accept or reject the authorization.
 * Either way Twitch redirects back to a URL of our choosing.
 *
 * If the user chooses to Authorize, the response we get contains a code that
 * can be used to request an access token.
 *
 * This function uses that code and makes the necessary requests to obtain the
 * token and store it in the database. */
async function getAccessToken(api, name, code) {
  try {
    // Using the code that we got, request a token by hitting the appropriate
    // Twitch API endpoint. The result should be our token, and some information
    // about it, such as when it expires and how to get a new one.
    const response = await axios({
      url: 'https://id.twitch.tv/oauth2/token',
      method: 'POST',
      data: {
        client_id: api.config.get('twitch.core.clientId'),
        client_secret: api.config.get('twitch.core.clientSecret'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: api.config.get(`twitch.core.${name}CallbackURL`)
      }
    });

    // We want to store the token data into the database in a record that is
    // based on the "name" of the token. This is something that we use locally
    // to be able to distinguish between several tokens we might have at any
    // given time.

    // The token and refresh token are encrypted when we put them into the
    // database to keep them safe from casual inspection.
    await api.db.getModel('authorize').updateOrCreate({ name }, {
      name: name,
      type: response.data.token_type,
      token: api.crypto.encrypt(response.data.access_token),
      refreshToken: api.crypto.encrypt(response.data.refresh_token),
      scopes: response.data.scope,
      obtained: Date.now(),
      expiration: response.data.expires_in,
    });

  }

  catch (error) {
    // If getting the token fails, make sure that we get rid of any existing
    // token by this name that we might have. This could have been an attempt to
    // change the scopes, and if the user said no, make them explicitly try it
    // again if they want it.
    await api.db.getModel('authorize').remove({ name });

    api.log.error(`${error.response.status} : ${JSON.stringify(error.response.data)}`);
    api.log.error(`${error}`);
  }
}

// =============================================================================

/* Create a Twurple authorization object that wraps the token with the local
 * name given. Details on the token will be queried from the database.
 *
 * The Twurple auth provider is for using the Twurple libraries to do
/* Create an authorization object that wraps the token with the given name,
 * which will be queried from the database. This can be used in calls as an
 * authorization source; it will ensure that the token is up to date.
 *
 * When new tokens are generated at runtime (via a refresh), the database will
 * be updated to include the new token. */
async function getAuthProvider(api, name) {
  // Pull the core information we need out of the configuration and alias it
  // for clarity later.
  const clientId = api.config.get('twitch.core.clientId');
  const clientSecret = api.config.get('twitch.core.clientSecret');
  const model = api.db.getModel('authorize');

  // Look up the record for the token that has the name that we expect; we can
  // leave if it's not found.
  const record = await model.findOne({ name });
  if (record === undefined) {
    return null;
  }

  // The Twurple library has an authorization object that can ensure that the
  // token is valid and up to date, and pass it along in all API queries. To use
  // that, we need an object in the shape of a specific AuthToken interface
  // in the Twurple library. */
  const tokenData = {
    accessToken: api.crypto.decrypt(record.token),
    refreshToken: api.crypto.decrypt(record.refreshToken),
    scope: record.scopes,
    expiresIn: record.expiration,
    obtainmentTimestamp: record.obtained
  };

  return new RefreshingAuthProvider(
    {
      clientId,
      clientSecret,
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

/* Handle the callback that occurs when someone hits one of our Twitch Auth
 * callbacks. The incoming request needs to be passed in, as does the response
 * object and an indication of which of the callbacks this is.
 *
 * The response that comes back to us should contain a `code` parameter that
 * we can use to make a server to server request that will get us our token.
 *
 * A part of this response will be a `state` parameter which is an opaque clone
 * of what we provided when we did the original auth. This is a security
 * mechanism that ensures that when we get a callback, it's the one that we
 * expected to get and must match the one provided in the call.
 *
 * Regardless of success or failure, this will cause the browser to redirect
 * back to the Twitch fullbleed panel in the dashboard.
 *
 * On success, this will update the database for the appropriate token so that
 * it can be gathered and reused later. When the token request fails or does
 * not have a code (which indicates the user did not authorize) the existing
 * token (if any) and anything using it is removed. */
async function handleAuthCallback(api, state, name, req, res)  {
  // The query paramters that come back include a code value that we need to
  // use to obtain our actual access token.
  const code = req.query.code;
  const inState = req.query.state;

  // If no code comes back, it's because the user decided not to authorize.
  // We should respond to this by removing any tokens that we currently have.
  if (code === undefined) {
    // If getting the token fails, make sure that we get rid of any existing
    // token.
    await api.db.getModel('authorize').remove({ name });

    api.log.warn(`User did not confirm authorization`);
  } else {
    // There is a code; if the state is not the same as the one that we gave
    // to Twitch when the authorization started, don't trust anything in this
    // resonse.
    if (inState !== state) {
      // If getting the token fails, make sure that we get rid of any existing
      // token.
      await api.db.getModel('authorize').remove({ name });

      api.log.error(`auth callback got out of date authorization code; potential spoof?`);
    } else {
      // Fetch the token.
      await getAccessToken(api, name, code);
    }
  }

  // No matter what happens, set up the Twitch API using this token; if there
  // isn't one, the Twitch API will be removed, otherwise it's set up. We
  // then redirect back to the dashboard, which will make the front end
  // request data from us.
  if (name === 'bot') {
    setupTwitchAPI(api, name);
  }
  res.redirect('/dashboard/#fullbleed/twitch');
}

/* This handles a request to deauthorize a specifically named token. The record
 * for the token will be removed from the database and the page will be
 * redirected back to the main Twitch full bleed panel. */
async function performTokenDeauth(name, req, res) {
  await api.db.getModel('authorize').remove({ name });
  if (name === 'bot') {
    setupTwitchAPI(api, name);
  }

  res.redirect('/dashboard/#fullbleed/twitch');
}

// =============================================================================

/* Set up the Twitch API endpoints inside of the given api struct using the
 * token with the given name.
 *
 * If there is an authorized and cached token by that name it will be refreshed
 * and used to set up a Twitch Auth provider and a Twitch API endpoint.
 *
 * When there's no token, those items are actively removed from the given api
 * struct.
 *
 * Thus, thus should be called any time the state of authorization changes. */
async function setupTwitchAPI(api, name) {
  // Get an auth provider based on the name of the token we're supposed to be
  // using.
  api.auth = await getAuthProvider(api, name)
  if (api.auth === null) {
    api.auth = undefined;
    api.twitch = undefined;
    return api.log.warn(`No bot authorization token for '${name}' found`);
  }

  api.log.info(`Loaded bot user token '${name}'; refreshing the token`);

  // Make sure that the token is valid; it might not be, in which case it
  // needs to be refreshed. The library doesn't seem to do this for an
  // initial request made with this auth.
  await api.auth.getAccessToken();

  // Create a Twitch API instance from which we can make requests. This will
  // be tied to the bot authorization token, although it does it for other
  // subsequent reqeusts from the same user.
  api.twitch = new ApiClient({ authProvider: api.auth });
}

/* This will find the token with the given name and return back the userId that
 * is associated with that token. If there is no such token found, undefined
 * will be returned instead. */
async function getUserIdFromToken(api, name) {
  // Look up the token that we were asked about; leave if we didn't find it.
  const model = api.db.getModel('authorize');
  const record = await model.findOne({ name });
  if (record === undefined) {
    return;
  }

  // Get our clientID and decrypt the access token in the record we found.
  const clientId = api.config.get('twitch.core.clientId');
  const accessToken = api.crypto.decrypt(record.token);

  // Request information on the token and if found we can return back the
  // userId.
  const result = await getTokenInfo(accessToken, clientId);
  if (result !== null) {
    return result.userId;
  }
}

/* Given the name of a token, this will gather the information for the user that
 * is associated with that token and send it to the front end using a message
 * whose name is based on the token name itself.
 *
 * This will always send, but it will send an empty object if the token is not
 * found or the twitch API is not currently set up. */
async function sendUserInfo(api, name) {
  let userInfo = {};
  const userId = await getUserIdFromToken(api, name);

  if (api.twitch !== undefined && userId != undefined) {
    const result = await api.twitch.users.getUserById(userId);

    userInfo.profilePictureUrl = result.profilePictureUrl;
    userInfo.displayName = result.displayName;
    userInfo.name = result.name;
    userInfo.broadcasterType = result.broadcasterType;
    userInfo.creationDate = result.creationDate;
    userInfo.description = result.description;

    //   {
    //     broadcasterType: result.broadcasterType,
    //     creationDate: result.creationDate,
    //     description: result.description,
    //     displayName: result.displayName,
    //     email: result.email,
    //     id: result.id,
    //     name: result.name,
    //     offlinePlaceholderUrl: result.offlinePlaceholderUrl,
    //     profilePictureUrl: result.profilePictureUrl,
    //     type: result.type,
    //     views: result.views
    //   });
    // }
  }

  api.nodecg.sendMessage(`${name}-user-info`, userInfo)
}

// =============================================================================

/* In order to talk to twitch we need to be able to use the Twitch OAuth 2
 * authentication flows to get the tokens that we require.
 *
 * This sets up the back end required for our authentication to work. This
 * consists of NodeCG messages that allow for us to share information with the
 * front end code as well as responding to requests made by Twitch during the
 * flow. */
async function setup_auth(api) {
  // When we set up the authorization system, try to set up an authorization
  // provider and Twitch API client for the token that represents the bot. If
  // if this fails, the items are not set up at all, which is a signal to other
  // code that there is no token.
  //
  // Care must be taken to adjust this if the token is ever dropped or lost.
  await setupTwitchAPI(api, 'bot')

  // One of the paramters in the URL that we pass to Twitch to start
  // authorization is a randomlized string of text called the "state". This
  // value can be anything we like. When Twitch calls back to our callback URL
  // it passes the state string it was given back.
  //
  // Our end can use this to ensure that whenever the authorization endpoint is
  // triggered, that it is in response to a request that we initiated.
  let state = uuidv4();

  // The front end can ask us at any time to generate and send it a URL for
  // authorizing with Twitch; we respond by generating a new URL and sending
  // it back in another message.
  //
  // Every time this happens a new authorization state value is generated.
  api.nodecg.listenFor('get-twitch-auth-url', type => {
    state = uuidv4();
    api.nodecg.sendMessage('auth-redirect-url', { type, url: getAuthURL(api, type, state)});
  });

  // When requests by the front end, return information that's needed for it to
  // display who's currently authenticated as the bot account or the channel
  // that the bot should run inside of.
  //
  // This will send a message back the other way to deliver the data, which
  // could be an empty object if there is no data available yet.
  api.nodecg.listenFor('get-bot-user-info', async () => sendUserInfo(api, 'bot'));
  api.nodecg.listenFor('get-user-user-info', async () => sendUserInfo(api, 'user'));

  // Ask the express server in NodeCG to create a new router for us.
  const app = api.nodecg.Router();

  // Listen for an incoming request from Twitch for the bot account; this will
  // happen in response to the user clicking either Authorize or Cancel on the
  // authorization page that Twitch presents.
  app.get(new URL(api.config.get('twitch.core.botCallbackURL')).pathname,
    (req, res) => handleAuthCallback(api, state, 'bot', req, res));

  // Do the same thing for the user account.
  app.get(new URL(api.config.get('twitch.core.userCallbackURL')).pathname,
    (req, res) => handleAuthCallback(api, state, 'user', req, res));

  // Listen for an incoming request to deauthorize the bot account. When we
  // receive it we remove any token that we might have, remove the Twitch API
  // from the main api, and make the panel reload.
  app.get('/bot/deauth', async (req, res) => performTokenDeauth('bot', req, res));
  app.get('/user/deauth', async (req, res) => performTokenDeauth('user', req, res));

  api.nodecg.mount(app);
}

module.exports = setup_auth;