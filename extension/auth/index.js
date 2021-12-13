'use strict';


// =============================================================================


const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const { RefreshingAuthProvider, getTokenInfo } = require('@twurple/auth');


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
  const bot_scopes = 'chat:read chat:edit';
  const user_scopes = 'user:read:email'

  const params = {
    client_id: api.config.get('twitch.core.clientId'),
    redirect_uri: api.config.get(`twitch.core.${type}CallbackURL`),
    force_verify: true,
    response_type: 'code',
    scope: (type == 'bot') ? bot_scopes : user_scopes,
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

    // For any token we obtain, we want to keep a record of the user that's
    // associated with it so that the code that gets user information doesn't
    // need to try to get it from the token itself.
    const tokenInfo = await getTokenInfo(response.data.access_token, api.config.get('twitch.core.clientId'));
    const result = await api.twitch.users.getUserById(tokenInfo.userId);

    await api.db.getModel('users').updateOrCreate({ type: name }, {
      type: name,
      userId: result.id
    });

    // If the token we grabbed was for the user of the bot, then we want to look
    // up the information for that user and store that user's information into
    // the configuration section of the database.
    if (name != 'user') {
      // This is not the user token, so persist the information about it into
      // the database. This can be later pulled out in order to re-create the
      // token and refresh it as needed.
      //
      // The token and refresh token are encrypted when we put them into the
      // database to keep them safe from casual inspection.
      await api.db.getModel('tokens').updateOrCreate({ name }, {
        name: name,
        type: response.data.token_type,
        token: api.crypto.encrypt(response.data.access_token),
        refreshToken: api.crypto.encrypt(response.data.refresh_token),
        scopes: response.data.scope,
        obtained: Date.now(),
        expiration: response.data.expires_in,
      });
    }
  }

  catch (error) {
    // If getting the token fails, make sure that we get rid of any existing
    // token by this name that we might have. This could have been an attempt to
    // change the scopes, and if the user said no, make them explicitly try it
    // again if they want it.
    await api.db.getModel('tokens').remove({ name });

    api.log.error(`${error.response.status} : ${JSON.stringify(error.response.data)}`);
    api.log.error(`${error}`);
  }
}


// =============================================================================


/* Create a Twurple authorization object that wraps the token with the local
 * name given. Details required to refresh the token will be queried from the
 * database.
 *
 * The Twurple Auth provider is for using the Twurple libraries to do operations
 * on Twitch and it's API's, and they ensure that there is a token and that it
 * will refresh itself as needed if the app is long running. */
async function getAuthProvider(api, name) {
  // Pull the core information we need out of the configuration and alias it
  // for clarity later.
  const clientId = api.config.get('twitch.core.clientId');
  const clientSecret = api.config.get('twitch.core.clientSecret');

  api.log.info(`Fetching ${name} access token`);

  // This is not an app token, so we need to get the token data from the token
  // with the given name; for that we will need to pull the record from the
  // database.
  const model = api.db.getModel('tokens');

  // If there is no record found for this token, we can't set up an Auth
  // provider for it.
  const record = await model.findOne({ name });
  if (record === undefined) {
    return null;
  }

  // The Twurple library has an authorization object that can ensure that the
  // token is valid and up to date. For a token we created ourselves we need
  // to synthesize such an object based on information we have.
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


// =============================================================================


/* Handle the callback that occurs when someone hits one of our Twitch Auth
 * callbacks. The incoming request needs to be passed in, as does the response
 * object and an indication of which of the callbacks this is.
 *
 * The response that comes back to us should contain a 'code' parameter that
 * we can use to make a server to server request that will get us our token.
 *
 * A part of this response will be a 'state' parameter which is an opaque clone
 * of what we provided when we did the original Auth. This is a security
 * mechanism that ensures that when we get a callback, it's the one that we
 * expected to get and must match the one provided in the call.
 *
 * Regardless of success or failure, this will cause the browser to redirect
 * back to the Twitch full bleed panel in the dashboard.
 *
 * On success, this will update the database with the appropriate data so that
 * it can be gathered and reused later. When the token request fails or does
 * not have a code (which indicates the user did not authorize) the existing
 * data (if any) and anything using it is removed from the database. */
async function handleAuthCallback(api, state, name, req, res)  {
  // The query parameters that come back include a code value that we need to
  // use to obtain our actual access token.
  const code = req.query.code;
  const inState = req.query.state;

  // If no code comes back, it's because the user decided not to authorize.
  // We should respond to this by removing any tokens that we currently have.
  if (code === undefined) {
    // If getting the token fails, make sure that we get rid of any existing
    // token.
    await api.db.getModel('tokens').remove({ name });

    api.log.warn(`User did not confirm authorization`);
  } else {
    // There is a code; if the state is not the same as the one that we gave
    // to Twitch when the authorization started, don't trust anything in this
    // response.
    if (inState !== state) {
      // If getting the token fails, make sure that we get rid of any existing
      // token.
      await api.db.getModel('tokens').remove({ name });

      api.log.error(`auth callback got out of date authorization code; potential spoof?`);
    } else {
      // The code is non-empty and matches what we expect, so we can fetch the
      // access token now.
      await getAccessToken(api, name, code);
    }
  }

  res.redirect('/dashboard/#fullbleed/twitch');
}


// =============================================================================


/* In order to set up the account that the bot will run as and the channel that
 * the bot will run inside of, we need to authorize accounts with Twitch. To
 * do that we need to craft a specific URL that we send the browser to, which
 * Twitch will handle before redirecting back to us.
 *
 * This function is used to kick off the authentication step by responding to a
 * web request with a redirect to an appropriate location.
 *
 * Part of this request is a unique state value that Twitch will pass back that
 * we can use to verify that the callback is valid. This will include such a
 * value in the URL and return it back so that the other handler can grab it
 * and use it to verify things. */
function performTokenAuth(api, name, req, res) {
    const state = uuidv4();
    res.redirect(getAuthURL(api, name, state));

    return state;
}


// =============================================================================


/* This handles a request to de-authorize a specifically named token. The record
 * for the token will be removed from the database and the page will be
 * redirected back to the main Twitch full bleed panel. */
async function performTokenDeauth(api, name, req, res) {
  // Remove the token and user record for this name, if any; these operations
  // may not do anything, such as for the user, who doesn't have a token in the
  // tokens table because their token is for authorization only. This is OK.
  await api.db.getModel('tokens').remove({ name });
  await api.db.getModel('users').remove({ type: name });

  res.redirect('/dashboard/#fullbleed/twitch');
}


// =============================================================================


/* This will find the token with the given name and return back the userId that
 * is associated with that token. If there is no such token found, undefined
 * will be returned instead. */
async function getUserIdFromToken(api, name) {
  // Look up the token that we were asked about; leave if we didn't find it.
  const model = api.db.getModel('tokens');
  const record = await model.findOne({ name });
  if (record === undefined) {
    return;
  }

  // Get our clientID and decrypt the access token in the record we found.
  const clientId = api.config.get('twitch.core.clientId');
  const accessToken = api.crypto.decrypt(record.token);

  // Request information on the token and, if found, we can return back the
  // userId.
  const result = await getTokenInfo(accessToken, clientId);
  if (result !== null) {
    return result.userId;
  }
}


// =============================================================================


/* This will look up the information on the user that has the type given and
 * send the information back to the front end for display in its user interface.
 *
 * If there's not an appropriate user, then this will send an empty object
 * instead, so that the front end knows that there's no user assigned. */
async function sendUserChannelInfo(api, type) {
  let userInfo = {};
  const record = await api.db.getModel('users').findOne({ type });

  if (record != null) {
    const result = await api.twitch.users.getUserById(record.userId);

    userInfo.profilePictureUrl = result.profilePictureUrl;
    userInfo.displayName = result.displayName;
    userInfo.name = result.name;
    userInfo.broadcasterType = result.broadcasterType;
    userInfo.creationDate = result.creationDate;
    userInfo.description = result.description;
  }

  api.nodecg.sendMessage(`${type}-user-info`, userInfo);
}


// =============================================================================


/* This section sets up the core of the code used to authorize accounts with
 * Twitch using the OAuth2 flows, which require us to direct the browser to a
 * specific page on Twitch, where the user can choose to authorize.
 *
 * This requires some web endpoints on our end to negotiate the transfers as
 * well as some support code. */
async function setup_auth(api) {
  // One of the parameters in the URL that we pass to Twitch to start
  // authorization is a randomized string of text called the "state". This
  // value can be anything we like. When Twitch calls back to our callback URL
  // it passes the state string it was given back to us for verification.
  //
  // Our end can use this to ensure that whenever the authorization endpoint is
  // triggered, that it is in response to a request that we initiated. There's
  // one for each of the authorization URL's that might be going at any one
  // time.
  let botState = uuidv4();
  let userState = uuidv4();

  // Listen for requests from the front end for information that's needed for it
  // to display who's currently authenticated as the bot account or the channel
  // that the bot should run inside of and send the results back in a message.
  api.nodecg.listenFor('get-bot-user-info', async () => sendUserChannelInfo(api, 'bot'));
  api.nodecg.listenFor('get-user-user-info', async () => sendUserChannelInfo(api, 'user'));

  // Ask the express server in NodeCG to create a new router for us.
  const app = api.nodecg.Router();

  // In order to start a bot or user authentication, the front end should hit
  // these endpoints, which will redirect the browser to an appropriate page  on
  // Twitch for authorization.
  //
  // These also grab and store the state values that will be used when the
  // callback returns so that we can verify that they're up to date.
  app.get('/bot/auth', async (req, res) => botState = performTokenAuth(api, 'bot', req, res));
  app.get('/user/auth', async (req, res) => userState = performTokenAuth(api, 'user', req, res));

  // During an ongoing authorization request, we redirect to Twitch and wait for
  // the user to either authorize or cancel the request, which will cause Twitch
  // to redirect back to a URL that we give it. This is our opportunity to
  // either finish the Auth or know that the user cancelled it.
  app.get(new URL(api.config.get('twitch.core.botCallbackURL')).pathname,
    (req, res) => handleAuthCallback(api, botState, 'bot', req, res));
  app.get(new URL(api.config.get('twitch.core.userCallbackURL')).pathname,
    (req, res) => handleAuthCallback(api, userState, 'user', req, res));

  // Listen for an incoming request to disconnect a twitch account. When we
  // receive it we make sure that the back end data is removed and states are
  // changed accordingly.
  app.get('/bot/deauth', async (req, res) => performTokenDeauth(api, 'bot', req, res));
  app.get('/user/deauth', async (req, res) => performTokenDeauth(api, 'user', req, res));

  api.nodecg.mount(app);
}


// =============================================================================


module.exports = setup_auth;
