document.getElementById('auth').addEventListener('click', e => {
  console.log('we did it');
});

// Define our constants, you will change these with your own
const TWITCH_CLIENT_ID = 'q0xqvkmbfl8834g1rvqamjwbvxf3if';
const CALLBACK_URL     = 'http://localhost:9090/auth/twitch/callback';


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