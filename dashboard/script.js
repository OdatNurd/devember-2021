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

// OAuth Authorization Code Flow - User Access Token
//--------------------------------------------------
/*

1. Send the user to our redirect URL; it will take you to auth

https://id.twitch.tv/oauth2/authorize?client_id=q0xqvkmbfl8834g1rvqamjwbvxf3if&redirect_uri=http%3A%2F%2Flocalhost%3A9090%2Fauth%2Ftwitch%2Fcallback&response_type=code&scope=user:read:email


GET https://id.twitch.tv/oauth2/authorize
    ?client_id=<your client ID>
    &redirect_uri=<your registered redirect URI>
    &response_type=code
    &scope=<space-separated list of scopes>
    &state=BLERBYBLURB

After the user authenticates, you get redirected to the given redirect URL,
which should be a back end URL that allows the server to make a request to get
a token based on the code provided in the callback URL.
*
*/