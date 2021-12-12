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

// This is used to fill out the bot information in the bot panel when there is
// no authorized bot account. The values here should convey that there is no
// bot account authorized (and thus nothing can happen with the bot) and that
// the user should authorize with the account that the bot should run as.
const botDefaults = {
  avatar: 'res/images/bot-avatar.png',
  acctType: '',
  joinDate: '',
  about: 'There is currently no Twitch account authorized for the bot; ' +
         'use the button below to authorize an account. The account chosen ' +
         'will appear as the bot in the authorized channel.',

  emptyName: 'No bot account is current authorized',
  authLink:   '/bot/auth',
  deauthLink: '/bot/deauth',

  deauthBtnText: 'Revoke Bot Account Authorization',
  authBtnText: 'Authorize with Bot Account',
};

// This is used to fill out the channel account information in the channel
// panel when there is not an authorized account for the bot to be run inside
// of.
//
// This is used as the above, but in a different panel.
const chanDefaults = {
  avatar: 'res/images/user-avatar.png',
  acctType: '',
  joinDate: '',
  about: 'The bot is currently not authorized to join any channels; ' +
         'use the button below to authorize a channel. The bot will join ' +
         'the authorized channel.',

  emptyName: 'The bot is not currently authorized to join any channel',
  authLink:   '/user/auth',
  deauthLink: '/user/deauth',

  deauthBtnText: 'Revoke Channel Authorization',
  authBtnText: 'Authorize Bot for your channel',
};


// =============================================================================

// When we ask the back end code for information on the user that the bot is
// running as, it responds by dispatching this message to tell us. We use the
// information to set up the panel as appropriate.
nodecg.listenFor('bot-user-info', botInfo => displayLoginInfo('bot', botInfo))
nodecg.listenFor('user-user-info', userInfo => displayLoginInfo('user', userInfo))

// The authorization mechanism allows us to include a randomized "state" value
// that Twitch will return back to us when we authorize, allowing us to know
// that the response we get is genuine. This should be changed up, and so when
// we need a new URL, we ask the back end for one. The response will be this
// message, which gives us the URL we need so we can apply it to the authorize
// button.
nodecg.listenFor('auth-redirect-url', link => {
  document.getElementById(`${link.type}-auth-link`).href = link.url
});

// =============================================================================

// The fields and controls in the Bot Account panel on the dashboard page.
//
// These are used to display the user that's currently authorized to act as the
// bot and the controls used to log it in and out.

// =============================================================================

/* Set up the user information in the given panel, which shows which Twitch user
 * is authorized for various things (the bot account, the channel the bot runs
 * in ,etc).
 *
 * If there is no account currently authorized, this will clear any fields that
 * need clearing and make sure that the button displays the appropriate message
 * and goes to the right place when clicked.
 *
 * This is signaled by the acctInfo not having any fields.*/
function displayLoginInfo(panel, acctInfo) {
  // Fetch the elements for the controls we want to update; these vary by panel.
  let avatarImg = document.getElementById(`${panel}-avatar`);
  let userInfo = document.getElementById(`${panel}-user`);
  let acctType = document.getElementById(`${panel}-type`);
  let joinDate = document.getElementById(`${panel}-date`);
  let about = document.getElementById(`${panel}-about`);
  let authLink = document.getElementById(`${panel}-auth-link`);
  let authBtn = document.getElementById(`${panel}-authorize-btn`);

  // Get the appropriate defaults for the type of panel that we're currently
  // displaying information for.
  const defaults = (panel === 'bot' ? botDefaults : chanDefaults);

  // Set up the main display information for this user; if the incoming object
  // has no fields (user is logged out) this changes to default values.
  avatarImg.src = acctInfo.profilePictureUrl ?? defaults.avatar;
  acctType.innerText = acctInfo.broadcasterType ?? defaults.acctType;
  joinDate.innerText = (acctInfo.creationDate != undefined)
                        ? new Date(acctInfo.creationDate).toLocaleDateString()
                        : defaults.joinDate;
  about.innerText = acctInfo.description ?? defaults.about;

  // What appears in the user name and what the button looks like and links to
  // is different depending on whether the request we got indicates that a bot
  // account is authorized or not.
  if (acctInfo.name !== undefined && acctInfo.displayName !== undefined) {
    userInfo.innerText = `${acctInfo.displayName} (${acctInfo.name})`;

    // Make the auth button a deauth button.
    authBtn.innerText = defaults.deauthBtnText;
    authLink.href = defaults.deauthLink;
  } else {
    userInfo.innerText = defaults.emptyName;

    // Set the button text and then ask the back end for a new URL; when it
    // arrives, the URL on the button will change. In the interim the link that
    // is currently on the button is redacted so that clicking it won't do
    // anything until the response comes back.
    authBtn.innerText = defaults.authBtnText;
    authLink.href = defaults.authLink;;
  }
}

// When the page loads, ask the back end for the information on the currently
// active bot account, if any. The result of this will be a call to the code
// that sets up the panel as appropriate.
nodecg.sendMessage('get-bot-user-info');
nodecg.sendMessage('get-user-user-info');
