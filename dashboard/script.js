let botAvatar = document.getElementById('bot-avatar');
let botUser = document.getElementById('bot-user');
let botType = document.getElementById('bot-type');
let botDate = document.getElementById('bot-date');
let botAbout = document.getElementById('bot-about');
let authLink = document.getElementById('auth-link');
let botAuthBtn = document.getElementById('bot-authorize-btn');

/* Refresh the authorization URL that we launch to when we're trying to
 * authorize the bot. This asks the back end for the URL, which will contain a
 * random state token that we provide in our request.
 *
 * NOTE: If the state parameter in our URL doesn't match what our back end
 *       server thinks the state is, the authorization will fail because it's a
 *       potential spoof operation. Currently, this means that the front end
 *       needs to refresh if the back end restarts. */
function refreshAuthURL() {
  nodecg.sendMessage('get-twitch-auth-url');

  // Trigger another refresh in a short time.
  window.setTimeout(refreshAuthURL, 60000);
}

/* Set up the bot panel to display information that tells the user that no
 * account is currently authorized for use as the bot account. This will clear
 * any fields that need clearing and make sure that the button displays the
 * appropriate message and goes to the right place when clicked. */
function displayLoginInfo() {
  botAvatar.src = 'res/images/avatar.png';

  botUser.innerText = 'No bot account is currently authorized';
  botType.innerText = '';
  botDate.innerText = '';
  botAbout.innerText = 'There is currently no Twitch account authorized for the bot; ' +
                       'use the button below to authorize an account. The account chosen ' +
                       'will appear as the bot in the channel.'

  // Set up the button to have the correct text and go to the correct place.
  // The link change happens when the back end responds to our request for a
  // twitch authorization URL.
  botAuthBtn.innerText = 'Authorize with Bot Account'
  nodecg.sendMessage('get-twitch-auth-url');

  // For now, disable this; if the back end restarts, the front end will need to
  // do a manual reload to make sure it has the appropriate state paramter or
  // the auth will fail.
  //refreshAuthURL();
}

// When the back end gives us a message that contains a new authorization URL,
// update the link on the authorize button to go there.
nodecg.listenFor('auth-redirect-url', url => authLink.href = url);

// When the script runs, refresh the authorization URL that we go to when the
// authorize link is clicked so that it has new random state in it. The state is
// passed to Twitch, which sends it back, and we can use that to make sure that
// the incoming request is not fake.
// nodecg.sendMessage('get-twitch-auth-url');
displayLoginInfo();
