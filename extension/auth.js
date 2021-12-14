'use strict';


// =============================================================================


const { getTokenInfo } = require('@twurple/auth');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');


// =============================================================================


/* This sends an authorization state change event to any interested listeners to
 * let them know that the authorization state of one of the bot accounts has
 * changed, allowing them to take appropriate actions.
 *
 * event is one of 'auth' or 'deauth' to indicate if the event being raised is
 * an authorization or deauthorization event, and type should be the type of
 * the authorization being altered (e.g. 'bot' or 'user') */
function sendAuthStateEvent(api, event, type) {
    api.nodecg.sendMessage(`${event}-complete`, type);
}


// =============================================================================


/* Given a user type of a logged in account (either 'user' or 'bot'), gather the
 * information about that user based on their userId and return it. The return
 * value will be null if there's no such authorized user or we can't get their
 * user information. */
async function getUserInfo(api, type) {
  // Get the userId record from the database for this user type.
  const record = await api.db.getModel('users').findOne({ type });
  if (record === undefined) {
    return null;
  }

  // Using the userId, query Twitch to determine the user information.
  const userInfo = await api.twitch.users.getUserById(record.userId);
  if (userInfo === null) {
    return null;
  }

  return userInfo;
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
    // Pull the core information we need out of the configuration and alias it
    // for clarity later.
    const clientId = api.config.get('twitch.core.clientId');
    const clientSecret = api.config.get('twitch.core.clientSecret');

    // Using the code that we got, request a token by hitting the appropriate
    // Twitch API endpoint. The result should be our token, and some information
    // about it, such as when it expires and how to get a new one.
    const response = await axios({
      url: 'https://id.twitch.tv/oauth2/token',
      method: 'POST',
      data: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: api.config.get(`twitch.core.${name}CallbackURL`)
      }
    });

    // Get the userID that is associated with the token that we just finished
    // authorizing.
    const tokenInfo = await getTokenInfo(response.data.access_token, clientId);
    const result = await api.twitch.users.getUserById(tokenInfo.userId);

    // Make a record in the table for this token, so that at any given point we
    // can easily fetch the ID back without the token. This happens regardless
    // of what the token is for.
    await api.db.getModel('users').updateOrCreate({ type: name }, {
      type: name,
      userId: result.id
    });

    // If the token is for the bot, then we want to store it in the tokens table
    // since it will be used later to connect the bot to chat. All of the token
    // information is persisted so that it can be pulled out and used in a
    // future run without having to authorize again.
    if (name != 'user') {
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

    // An authorization is now complete; send off a message to anyone that
    // is listening and wants to know; the type of the authorization will be
    // transmitted as a part of the message.
    sendAuthStateEvent(api, 'auth', name);
  }

  catch (error) {
    // If getting the token fails, make sure that we get rid of any existing
    // token by this name that we might have. This could have been an attempt to
    // change the scopes, and if the user said no, make them explicitly try it
    // again if they want it.
    await performTokenDeauth(api, name);

    api.log.error(`${error}`);
  }
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
    await performTokenDeauth(api, name);

    api.log.warn(`User did not confirm authorization`);
  } else {
    // There is a code; if the state is not the same as the one that we gave
    // to Twitch when the authorization started, don't trust anything in this
    // response.
    if (inState !== state) {
      // If getting the token fails, make sure that we get rid of any existing
      // token.
      await performTokenDeauth(api, name);

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


/* As a Twitch bot, we need to access information about users on Twitch and be
 * able to take actions as them or read their data (or both). This is done via
 * an authorization token wherein we ask the user to authorize us to gain access
 * to that which we need.
 *
 * This function kicks off such an authentication by responding to a web request
 * with a redirect to the appropriate page on Twitch that will ask the user to
 * do the authentication.
 *
 * Part of this request is a unique state value that Twitch will give back to us
 * when it tells us if the user authorized or not that we can use to verify that
 * the callback is valid.
 *
 * The value of that state is returned back from this call so that when the
 * request comes back we can verify that it's valid and not a potential spoof
 * attempt. */
function performTokenAuth(api, name, req, res) {
  const bot_scopes = 'chat:read chat:edit';
  const user_scopes = 'user:read:email'

  const params = {
    client_id: api.config.get('twitch.core.clientId'),
    redirect_uri: api.config.get(`twitch.core.${name}CallbackURL`),
    force_verify: true,
    response_type: 'code',
    scope: (name == 'bot') ? bot_scopes : user_scopes,
    state: uuidv4()
  };

  res.redirect(`https://id.twitch.tv/oauth2/authorize?${new URLSearchParams(params)}`);

  return params.state;
}


// =============================================================================


/* This handles a request to de-authorize a specifically named token. The record
 * for the token will be removed from the database and the page will be
 * redirected back to the main Twitch full bleed panel.
 *
 * This can be invoked from anywhere; the redirect will only happen if a res
 * paramter is provided. Thus this can also be used to take actions on our
 * end that clean up our records of who is authorized and who is not.
 *
 * As an important note, despite the name this only makes us forget that the
 * user authorized a particular account. Twitch will keep a record that the
 * authorization was actually made and this needs to be cleaned up there, if
 * desired. */
async function performTokenDeauth(api, name, req, res) {
  // Remove the token and user record for this name, if any; these operations
  // may not do anything, such as for the user, who doesn't have a token in the
  // tokens table because their token is for authorization only. This is OK.
  await api.db.getModel('tokens').remove({ name });
  await api.db.getModel('users').remove({ type: name });

  // An authorization was removed; so send a message that tells people who care
  // that this authorization is now no longer valid.
  sendAuthStateEvent(api, 'deauth', name);

  // If we were called as a part of an express route handler, this operation was
  // done as part of a click in the user interface, so go back there.
  if (res !== undefined) {
    res.redirect('/dashboard/#fullbleed/twitch');
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
  const record = await getUserInfo(api, type);

  if (record != null) {
    userInfo.profilePictureUrl = record.profilePictureUrl;
    userInfo.displayName = record.displayName;
    userInfo.name = record.name;
    userInfo.broadcasterType = record.broadcasterType;
    userInfo.creationDate = record.creationDate;
    userInfo.description = record.description;
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

  // In order to start an account authentication, the front end will hit these
  // endpoints, which will cause the browser to redirect to an appropriate
  // Twitch page to start the authorization.
  //
  // Part of this process is providing a unique state item to Twitch which will
  // be given back to us when the authorization is complete so that we can
  // verify that the request we're getting is one that we expected to see.
  //
  // That state is saved here so that it can be used in the verification process
  // at the end.
  app.get('/bot/auth', async (req, res) => botState = performTokenAuth(api, 'bot', req, res));
  app.get('/user/auth', async (req, res) => userState = performTokenAuth(api, 'user', req, res));

  // The user needs to be able to control removing authorization from the bot
  // for any authorized accounts. These endpoints do the cleanup on our end that
  // makes this possible.
  //
  // It's importqnt to note that this ONLY affects local state; Twitch stores
  // the list of applications you have authorized (and the access types you
  // confirmed during authorization) and keeps track of that information itself
  // unless you manually unlink it in your settings.
  //
  // The name here is primarily to provide the obverse of the auth endpoints.
  app.get('/bot/deauth', async (req, res) => performTokenDeauth(api, 'bot', req, res));
  app.get('/user/deauth', async (req, res) => performTokenDeauth(api, 'user', req, res));

  // During an ongoing authorization request, the browser displays a Twitch page
  // that allows you to specify what account you want to authorize and to verify
  // that the requested permissions are OK with you.
  //
  // Once you either confirm or reject the authorization, Twitch will respond
  // by redirecting the browser back to a specific page that it was given during
  // the initial auth.
  //
  // These handlers are used to handle that request, allowing our code to know
  // if the user authorized or not and to act accordingly.
  app.get(new URL(api.config.get('twitch.core.botCallbackURL')).pathname,
    (req, res) => handleAuthCallback(api, botState, 'bot', req, res));
  app.get(new URL(api.config.get('twitch.core.userCallbackURL')).pathname,
    (req, res) => handleAuthCallback(api, userState, 'user', req, res));

  // Activate our endpoints.
  api.nodecg.mount(app);

  // Before we leave, synthesize authorization events for any accounts that
  // started out already authorized due to a previous run. Anything that wants
  // to take action when it knows that there's an authorized account probably
  // wants to do so right away on startup and not just if someone happens to
  // drop and re-initiate their auth.
  const users = await api.db.getModel('users').find({});
  for (const user of users) {
    sendAuthStateEvent(api, 'auth', user.type);
  }
}


// =============================================================================


module.exports = { setup_auth, getUserInfo };
