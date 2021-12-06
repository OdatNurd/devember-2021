function refreshAuthURL() {
  nodecg.sendMessage('get-twitch-auth-url');
  window.setTimeout(refreshAuthURL, 60000);
}

// Rewrite the authorization button's href property with the proper auth link
// every time the back end tells us what the URL is.
nodecg.listenFor('auth-redirect-url', url => {
  const link = document.getElementById('auth-link');
  link.href = url;
});

// Ask for an auth URL.
refreshAuthURL();

// OAuth Client Credentials Flow - App Token
//------------------------------------------
//
// An Application token grants your application the right to make requests from
// the Twitch back end servers. Such requests are not associated with any
// particular user, and as such no user needs to authorize anything in order to
// obtain one.
//
// That said, some requests may ask for data specific to a user; in order for
// that data to be provided back the user must at some point have granted access
// to the information using a different authorization flow. The association here
// is drawn between the user at some point having authorized an application with
// a particular client_id to obtain the requested information.
//
// As such, one need only make a POST request to the required endpoint in order
// to obtain a token:
//
// POST https://id.twitch.tv/oauth2/token
//    ?client_id=<your client ID>
//    &client_secret=<your client secret>
//    &grant_type=client_credentials
//    &scope=<space-separated list of scopes>

// OAuth Authorization Code Flow - User Access Token
//--------------------------------------------------
//
// A User Access Token grants your application the right to take actions as
// another user. In this case that means allowing the bot to take actions as
// either you or your dedicated bot account. To get such a token you need to
// request that the user authorize their account, specifying the list of
// permissions (known as scopes) that you want access to.
//
// Send the user to our redirect URL; it will take you to auth
//
//   GET https://id.twitch.tv/oauth2/authorize
//       ?client_id=<your client ID>
//       &redirect_uri=<your registered redirect URI>
//       &response_type=code
//       &scope=<space-separated list of scopes>
//       &state=randombutsecureddatstring
//
// After the user authenticates, you get redirected to the given redirect URL,
// which should be a back end URL that allows the server to make a request to get
// a token based on the code provided in the callback URL.
//
// Regardless of wether the user authorizes or not, the request will come back to
// our registered redirect URI; the response that comes back will have a code in it
// if they said yes, and no code if no.
//
// The code needs to be handed to the back end in order to fetch the appropriate
// token by making a POST request to https://id.twitch.tv/oauth2/token:
//
//   const response = await axios({
//     url: 'https://id.twitch.tv/oauth2/token',
//     method: 'POST',
//     data: {
//       client_id: TWITCH_CLIENT_ID,
//       client_secret: TWITCH_SECRET,
//       code,
//       grant_type: 'authorization_code',
//       redirect_uri: CALLBACK_URL
//     }
//   });
//
// As a security measure, if the original request includes a state paramter, the
// value of that will be returned with the redirect so that we can be sure that the
// response that comes back is genuine.