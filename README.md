# Devember 2021 - TwitchBot

This repository represents my entry into [Devember](https://devember.org/) 2021
and is a simple Twitch bot written in JavaScript and NodeJS for use as a
[NodeCG](http://github.com/nodecg/nodecg) bundle.

Development work is being done this year on my [Twitch channel](https://twitch.tv/odatnurd)
which is also serving as the daily devlog; what better way to follow what the
day's work was than to actually watch the day's work.

OAuth Client Credentials Flow - App Token
-----------------------------------------

An Application token grants your application the right to make requests from
the Twitch back end servers. Such requests are not associated with any
particular user, and as such no user needs to authorize anything in order to
obtain one.

That said, some requests may ask for data specific to a user; in order for
that data to be provided back the user must at some point have granted access
to the information using a different authorization flow. The association here
is drawn between the user at some point having authorized an application with
a particular client_id to obtain the requested information.

As such, one need only make a POST request to the required endpoint in order
to obtain a token:

    POST https://id.twitch.tv/oauth2/token
       ?client_id=<your client ID>
       &client_secret=<your client secret>
       &grant_type=client_credentials
       &scope=<space-separated list of scopes>


OAuth Authorization Code Flow - User Access Token
--------------------------------------------------

A User Access Token grants your application the right to take actions as
another user. In this case that means allowing the bot to take actions as
either you or your dedicated bot account. To get such a token you need to
request that the user authorize their account, specifying the list of
permissions (known as scopes) that you want access to.

Send the user to our redirect URL; it will take you to auth

    GET https://id.twitch.tv/oauth2/authorize
        ?client_id=<your client ID>
        &redirect_uri=<your registered redirect URI>
        &response_type=code
        &scope=<space-separated list of scopes>
        &state=randombutsecureddatstring

After the user authenticates, you get redirected to the given redirect URL,
which should be a back end URL that allows the server to make a request to get
a token based on the code provided in the callback URL.

Regardless of wether the user authorizes or not, the request will come back to
our registered redirect URI; the response that comes back will have a code in it
if they said yes, and no code if no.

The code needs to be handed to the back end in order to fetch the appropriate
token by making a POST request to https://id.twitch.tv/oauth2/token:

```js
const response = await axios({
  url: 'https://id.twitch.tv/oauth2/token',
  method: 'POST',
  data: {
    client_id: TWITCH_CLIENT_ID,
    client_secret: TWITCH_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: CALLBACK_URL
  }
});
````

As a security measure, if the original request includes a state parameter, the
value of that will be returned with the redirect so that we can be sure that the
response that comes back is genuine.