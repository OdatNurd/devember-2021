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

/* Set up the bot panel to display information that tells the user about the
 * account that is currently authorized to be the bot. If there is no account
 * currently authorized, this will clear any fields that need clearing and make
 * sure that the button displays the * appropriate message and goes to the right
 * place when clicked. */
function displayLoginInfo(botInfo) {
  console.log(botInfo);

  botAvatar.src = botInfo.profilePictureUrl ?? 'res/images/avatar.png';
  botType.innerText = botInfo.broadcasterType ?? '';
  botDate.innerText = (botInfo.creationDate != undefined)
                        ? new Date(botInfo.creationDate).toLocaleDateString()
                        : '';
  botAbout.innerText = botInfo.description ??
                       'There is currently no Twitch account authorized for the bot; ' +
                       'use the button below to authorize an account. The account chosen ' +
                       'will appear as the bot in the channel.'

  // What appears in the user name and what the button looks like and links to
  // is different depending on whether the request we got indicates that a bot
  // account is authorized or not.
  if (botInfo.name !== undefined && botInfo.displayName !== undefined) {
    botUser.innerText = `${botInfo.displayName} (${botInfo.name})`;

    // Make the auth button a deauth button.
    botAuthBtn.innerText = 'Revoke Bot Account Authorization';
    authLink.href = '/bot/deauth';
  } else {
    botUser.innerText = 'No bot account is currently authorized';

    // Set the button text and then ask the back end for a new URL; when it
    // arrives, the URL on the button will change.
    botAuthBtn.innerText = 'Authorize with Bot Account'
    nodecg.sendMessage('get-twitch-auth-url');
  }
}

// When the back end gives us a message that contains a new authorization URL,
// update the link on the authorize button to go there.
nodecg.listenFor('auth-redirect-url', url => authLink.href = url);
nodecg.listenFor('bot-user-info', botInfo => displayLoginInfo(botInfo))

// When the page loads, ask the back end for the information on the currently
// active bot account, if any. The result of this will be a call to the code
// that sets up the panel as appropriate.
//
// NOTE: Currently if the back end restarts while the front end is already
//       loaded, an authorization attempt will fail as a spoof because the
//       front end only asks for the auth URL on load. That needs to be
//       fixed.
nodecg.sendMessage('get-bot-user-info');
