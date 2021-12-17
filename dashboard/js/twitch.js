// =============================================================================


// This is used to fill out the bot information in the bot panel when there is
// no authorized bot account. The values here should convey that there is no
// bot account authorized (and thus nothing can happen with the bot) and that
// the user should authorize with the account that the bot should run as.
const botDefaults = {
  avatar: 'res/img/twitch/bot-avatar.png',
  acctType: '',
  joinDate: '',
  about: `
    There is currently not a Twitch account authorized for the bot. <br/>
    <br />
    Use the button below to log in <strong><em>as the account you want the bot to
    run as;</em></strong> this will be the user that the bot speaks as in your
    channel.
  `,

  emptyName: 'There is currently not a bot account authorized',
  authLink:   '/bot/auth',
  deauthLink: '/bot/deauth',

  deauthBtnText: 'Disconnect Bot Account',
  authBtnText: 'Authorize a Bot Account',
};

// This is used to fill out the channel account information in the channel
// panel when there is not an authorized account for the bot to be run inside
// of.
//
// This is used as the above, but in a different panel.
const chanDefaults = {
  avatar: 'res/img/twitch/user-avatar.png',
  acctType: '',
  joinDate: '',
  about: `
  The bot is currently not authorized to join your Twitch channel. <br />
  <br/>

  Use the button below to log in <strong><em>as your streamer Twitch account;
  </em></strong> the bot will join this channel.
  `,

  emptyName: 'The bot is not currently authorized to join your channel',

  authLink:   '/user/auth',
  deauthLink: '/user/deauth',

  deauthBtnText: 'Leave Channel',
  authBtnText: 'Authorize Bot for your Channel',
};


// =============================================================================


// When we ask the back end code for information on the user that the bot is
// running as, it responds by dispatching this message to tell us. We use the
// information to set up the panel as appropriate.
nodecg.listenFor('bot-user-info', botInfo => displayLoginInfo('bot', botInfo))
nodecg.listenFor('user-user-info', userInfo => displayLoginInfo('user', userInfo))


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

  // We want some items to be title cased.
  const titleCase = str => str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();

  // Format the join date of this account; this will be an emtpy string if there
  // is no date, otherwise a human readable join date.
  let date = '';
  if (acctInfo.creationDate !== undefined) {
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    date = new Date(acctInfo.creationDate);
    date = `Joined ${date.toLocaleDateString(undefined, opts)}`;
  }

  // Set up the main display information for this user; if the incoming object
  // has no fields (user is logged out) this changes to default values.
  avatarImg.src = acctInfo.profilePictureUrl ?? defaults.avatar;
  acctType.innerText = titleCase(acctInfo.broadcasterType ?? defaults.acctType);
  joinDate.innerText = date;
  about.innerHTML = acctInfo.description ?? defaults.about;

  // The text and links in the buttons depend on what panel we're populating
  // and wether the state is currently authorized or not.
  if (acctInfo.name !== undefined && acctInfo.displayName !== undefined) {
    userInfo.innerText = `${acctInfo.displayName} (${acctInfo.name})`;

    // User is authorized; change the text and button link to a deauthorize
    // link.
    authBtn.innerText = defaults.deauthBtnText;
    authLink.href = defaults.deauthLink;
  } else {
    userInfo.innerText = defaults.emptyName;

    // User is not authorized; change the text and button link to an
    // authorization link.
    authBtn.innerText = defaults.authBtnText;
    authLink.href = defaults.authLink;;
  }
}


// =============================================================================


// When the page loads, ask the back end for the information on the currently
// active bot account, if any. The result of this will be a call to the code
// that sets up the panel as appropriate.
nodecg.sendMessage('get-bot-user-info');
nodecg.sendMessage('get-user-user-info');

// The panel has input buttons and forms that can be used to make the bot say
// text or do actions. Grab the appropriate elements.
const form = document.getElementById('bot-speak');
const text = document.getElementById('text-to-say');
const method = document.getElementById('text-send-method');

// Respond to submitting the form by sending text to the chat via a message.
form.addEventListener('submit', e => {
  e.preventDefault();
  text.select();
  nodecg.sendMessage(method.value === 'say' ? 'say-in-chat' : 'do-in-chat', text.value);
});


// =============================================================================
