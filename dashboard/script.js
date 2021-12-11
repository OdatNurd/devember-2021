// TODO:
//   - If the back end restarts while this page is loaded, the state parameter
//     for authorizations will be different because the front end is what
//     requests it on load; that needs to be fixed.
//
//   - We currently respond to getting auth link information by updating the
//     link on the authorize button. This should be smarter and only do that
//     while we're logged out; otherwise it will clobber the deauth link.
//     Currently not a huge issue because we only get the auth link in response
//     to the page loading and in being deauthorized, so it all works out.

// =============================================================================

// When we ask the back end code for information on the user that the bot is
// running as, it responds by dispatching this message to tell us. We use the
// information to set up the panel as appropriate.
nodecg.listenFor('bot-user-info', botInfo => displayLoginInfo(botInfo))

// The authorization mechanism allows us to include a randomized "state" value
// that Twitch will return back to us when we authorize, allowing us to know
// that the response we get is genuine. This should be changed up, and so when
// we need a new URL, we ask the back end for one. The response will be this
// message, which gives us the URL we need so we can apply it to the authorize
// button.
nodecg.listenFor('auth-redirect-url', url => document.getElementById('auth-link').href = url);

// =============================================================================

// The fields and controls in the Bot Account panel on the dashboard page.
//
// These are used to display the user that's currently authorized to act as the
// bot and the controls used to log it in and out.

// =============================================================================

/* Set up the bot panel to display information that tells the user about the
 * account that is currently authorized to be the bot.
 *
 * If there is no account currently authorized, this will clear any fields that
 * need clearing and make sure that the button displays the appropriate message
 * and goes to the right place when clicked.
 *
 * This is signaled by the botInfo not have any fields.*/
function displayLoginInfo(botInfo) {
  // Fetch the elements for the controls we want to update.
  let avatarImg = document.getElementById('bot-avatar');
  let userInfo = document.getElementById('bot-user');
  let acctType = document.getElementById('bot-type');
  let joinDate = document.getElementById('bot-date');
  let about = document.getElementById('bot-about');
  let authLink = document.getElementById('auth-link');
  let authBtn = document.getElementById('bot-authorize-btn');

  // Set up the main display information for this user; if the incoming object
  // has no fields (user is logged out) this changes to default values.
  avatarImg.src = botInfo.profilePictureUrl ?? 'res/images/avatar.png';
  acctType.innerText = botInfo.broadcasterType ?? '';
  joinDate.innerText = (botInfo.creationDate != undefined)
                        ? new Date(botInfo.creationDate).toLocaleDateString()
                        : '';
  about.innerText = botInfo.description ??
                       'There is currently no Twitch account authorized for the bot; ' +
                       'use the button below to authorize an account. The account chosen ' +
                       'will appear as the bot in the authorized channel.'

  // What appears in the user name and what the button looks like and links to
  // is different depending on whether the request we got indicates that a bot
  // account is authorized or not.
  if (botInfo.name !== undefined && botInfo.displayName !== undefined) {
    userInfo.innerText = `${botInfo.displayName} (${botInfo.name})`;

    // Make the auth button a deauth button.
    authBtn.innerText = 'Revoke Bot Account Authorization';
    authLink.href = '/bot/deauth';
  } else {
    userInfo.innerText = 'No bot account is currently authorized';

    // Set the button text and then ask the back end for a new URL; when it
    // arrives, the URL on the button will change.
    authBtn.innerText = 'Authorize with Bot Account'
    nodecg.sendMessage('get-twitch-auth-url');
  }
}

// When the page loads, ask the back end for the information on the currently
// active bot account, if any. The result of this will be a call to the code
// that sets up the panel as appropriate.
nodecg.sendMessage('get-bot-user-info');
