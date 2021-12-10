'use strict';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const { RefreshingAuthProvider } = require('@twurple/auth');
const { ApiClient } = require('@twurple/api');

/* Create an authorization object that wraps the token with the given name,
 * which will be queried from the database. This can be used in calls as an
 * authorization source; it will ensure that the token is up to date.
 *
 * When new tokens are generated at runtime (via a refresh), the database will
 * be updated to include the new token. */
async function getAuthProvider(api, name) {
  const clientId = api.config.get('twitch.core.clientId');
  const clientSecret = api.config.get('twitch.core.clientSecret');
  const model = api.db.getModel('authorize');

  const record = await model.findOne({ name });
  if (record === undefined) {
    return null;
  }

  // Construct an object of type AccessToken (from Twurple AUTH) to pass to the
  // provider for construction purposes.
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

/* Construct and return an authorization URL. This is the URL that the browser
 * needs to display in order for the authentication to start. */
function getAuthURL(api, state) {
  const params = {
    client_id: api.config.get('twitch.core.clientId'),
    redirect_uri: api.config.get('twitch.core.callbackURL'),
    force_verify: true,
    response_type: 'code',
    scope: 'user:read:email',
    state
  };

  return `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams(params)}`;
}

/* Given a code value that has been retreived by Twitch calling back to our
 * authorization endpoint, make the request of Twitch that exchanges the code
 * for an access token. */
async function getAccessToken(api, name, code) {
  try {
    // When the user authorizes our application, twitch will redirect back to
    // a callback URL that we gave it when we started with a special code. We
    // need to make a request using that code and the same parameters as the
    // original request in order for Twitch to give us the token we need.
    const response = await axios({
      url: 'https://id.twitch.tv/oauth2/token',
      method: 'POST',
      data: {
        client_id: api.config.get('twitch.core.clientId'),
        client_secret: api.config.get('twitch.core.clientSecret'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: api.config.get('twitch.core.callbackURL')
      }
    });

    // Store the token we got back in the database; this would only happen in
    // the case where the request was a success.
    await api.db.getModel('authorize').updateOrCreate({ name }, {
      name: name,
      type: response.data.token_type,
      token: api.crypto.encrypt(response.data.access_token),
      refreshToken: api.crypto.encrypt(response.data.refresh_token),
      scopes: response.data.scope,
      obtained: Date.now(),
      expiration: response.data.expires_in,
    });

    // The response data contains our token and refresh information:
    // {
    //   access_token: 'hejlbz0uc3dlv6xczza2q636r12l26',
    //   expires_in: 15635,
    //   refresh_token: 'r56o80811dk2hxmf7tizbfa9e19i62boop0lfw38hmplcb5i1r',
    //   scope: [ 'user:read:email' ],
    //   token_type: 'bearer'
    // }
  }

  catch (error) {
    // If getting the token fails, make sure that we get rid of any existing
    // token.
    await api.db.getModel('authorize').remove({ name });

    api.log.error(`${error.response.status} : ${JSON.stringify(error.response.data)}`);
    api.log.error(`${error}`);
  }
}

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
  // be tied to the bot authorization token.
  api.twitch = new ApiClient({ authProvider: api.auth });
}


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
  await setupTwitchAPI(api, 'user')

  //   const result = await twitchAPI.users.getMe(true);

  //   console.log({
  //     broadcasterType: result.broadcasterType,
  //     creationDate: result.creationDate,
  //     description: result.description,
  //     displayName: result.displayName,
  //     // email: result.email,
  //     id: result.id,
  //     name: result.name,
  //     offlinePlaceholderUrl: result.offlinePlaceholderUrl,
  //     profilePictureUrl: result.profilePictureUrl,
  //     type: result.type,
  //     views: result.views
  //   });
  // }

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
  api.nodecg.listenFor('get-twitch-auth-url', () => {
    state = uuidv4();
    api.nodecg.sendMessage('auth-redirect-url', getAuthURL(api, state));
  });

  // Ask the express server in NodeCG to create a new router for us.
  const app = api.nodecg.Router();

  // Listen for an incoming request from Twitch; this will happen in response to
  // the user clicking either Authorize or Cancel on the authorization page that
  // Twitch presents.
  app.get(new URL(api.config.get('twitch.core.callbackURL')).pathname, async (req, res) => {
    // The query paramters that come back include a code value that we need to
    // use to obtain our actual access token.
    const code = req.query.code;
    const inState = req.query.state;

    // If no code comes back, it's because the user decided not to authorize.
    // We should respond to this by removing any tokens that we currently have.
    if (code === undefined) {
      // If getting the token fails, make sure that we get rid of any existing
      // token.
      await api.db.getModel('authorize').remove({ name: 'user' });

      api.log.error(`User did not confirm authorization`);
    } else {
      // There is a code; if the state is not the same as the one that we gave
      // to Twitch when the authorization started, don't trust anything in this
      // resonse.
      if (inState !== state) {
        // If getting the token fails, make sure that we get rid of any existing
        // token.
        await api.db.getModel('authorize').remove({ name: 'user' });

        api.log.error(`auth callback got out of date authorization code; potential spoof?`);
      } else {
        // Fetch the token.
        getAccessToken(api, 'user', code);
      }
    }

    // No matter what happened, tell the browser to redirect back to the
    // dashboard.
    res.redirect('/dashboard/')
  });

  api.nodecg.mount(app);
}

module.exports = setup_auth;