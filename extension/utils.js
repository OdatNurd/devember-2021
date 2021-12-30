// =============================================================================


const { RefreshingAuthProvider } = require('@twurple/auth');


// =============================================================================


/* When changing the access level of a command, this specifies what values the
 * argument can take and what the resulting edited value should be. */
const access_options = {
  broadcaster: 0,
  broadcast: 0,
  channel:0,
  streamer:0,

  moderator: 1,
  mod: 1,
  mods: 1,

  vip: 2,
  vips: 2,

  regular: 3,
  regulars: 3,
  regs: 3,

  subscriber: 4,
  sub: 4,
  subs: 4,

  all: 5,
  everyone: 5,
  rabble: 5
};

/* This is a similar list to the above, but contains on a single representative
 * access level string for each item. This is for use in places where a list
 * of possible options is desired without providuing the more massive list.
 *
 * This should of course be kept up to date with the above to stop user
 * confusion. */
const access_options_short = ['streamer', 'mods', 'vips', 'regs', 'subs', 'all'];

/* This maps the various user levels that can be associated with features in
 * the bot such as command execution with a human displayable textual string.
 *
 * The array includes items in the order that the user levels are defined so
 * that it's a simple array access to do the lookup. */
const user_access_levels = [
  'broadcaster',
  'moderators',
  'VIPs',
  'regulars',
  'subscribers',
  'everyone'
];

/* The list of characters which are valid to start a command; these are the
 * characters which are less likely to be used as the start of the first word
 * in any message. */
const command_prefix_list = '!$%&|~';


// =============================================================================


/* Create a Twurple authorization object that wraps the token with the local
 * name given. Details required to refresh the token will be queried from the
 * database.
 *
 * The Twurple Auth provider is for using the Twurple libraries to do operations
 * on Twitch and it's API's, and they ensure that there is a token and that it
 * will refresh itself as needed if the app is long running. */
async function getAuthProvider(api, name) {
  api.log.info(`Fetching ${name} access token`);

  // If there is no record found for this token, we can't set up an Auth
  // provider for it.
  const model = api.db.getModel('tokens');
  const record = await model.findOne({ name });
  if (record === undefined) {
    return null;
  }

  // The Twurple library has an authorization object that can ensure that the
  // token is valid and up to date. Set up an appropriately shaped object from
  // the stored token data.
  const tokenData = {
    accessToken: api.crypto.decrypt(record.token),
    refreshToken: api.crypto.decrypt(record.refreshToken),
    scope: record.scopes,
    expiresIn: record.expiration,
    obtainmentTimestamp: record.obtained
  };

  // Create and return the auth provider.
  return new RefreshingAuthProvider(
    {
      clientId: api.config.get('twitch.core.clientId'),
      clientSecret: api.config.get('twitch.core.clientSecret'),
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


// =============================================================================


/* Given a string of text, this will remove any leading and trailing whitespace
 * from the string, as well as replacing all interior runs of 1 or more
 * whitespace characters with a single space.
 *
 * This is particuarly handy when using a template string to ensure that any
 * inner newlines are redacted away. */
function dedent(text) {
  return text.replace(/\s+/g, ' ').trim()
}


// =============================================================================


/* This sends usage information for the given command out to the channel chat.
 * The name of the command comes from the passed in command details, along with
 * the signature and a longer description of what the command actually does. */
function usage(api, cmd, signature, description) {
  api.chat.say(`Usage: ${cmd.name} ${signature} - ${dedent(description)}`);
}


// =============================================================================


/* Convert a cool down time for a command or other item (measured in
 * milliseconds) to a more human readable format. This will display times in
 * hours, minutes and (fractional) seconds, eliding any that are not relevant
 * to the provided interval. */
function cooldownToString(cooldown) {
  const result = [];
  let secs = cooldown / 1000;

  const hours = Math.floor(secs / (60 * 60));
  if (hours !== 0) {
    result.push(`${hours}h`)
    secs -= (hours * (60 * 60));
  }

  const mins = Math.floor(secs / 60);
  if (mins !== 0) {
    secs -= (mins * 60);
    result.push(`${mins}m`)
  }

  if (secs !== 0) {
    if (secs % 1 !== 0) {
      secs = secs.toFixed(2);
    }

    result.push(`${secs}s`)
  }

  return result.join('');
}


// =============================================================================


/* This takes an input string in a format that is a number followed by one of
 * the characters 's', 'm' or 'h' and converts it into an appropriate number of
 * milliseconds to represent that number of seconds, minutes or hours;
 * fractional numbers are allowed.
 *
 * Strings with no suffix are assumed to be in seconds. If the incoming string
 * is not in a recognized format, undefined will be returned; otherwise the time
 * in milliseconds is returned. */
function stringToCooldown(api, spec) {
  // If the last character of the spec isn't one of the ones we know about,
  // then assume that it's 's'.
  if (['s', 'h', 'm'].indexOf(spec[spec.length - 1]) === -1) {
    spec = `${spec}s`;
  }

  // The last character is the time specifier, and the remainder of the string
  // is the time in that unit; grab them both out.
  const value = spec.substr(0, spec.length - 1);
  const unit = spec[spec.length - 1];

  // The incoming value needs to be a valid number, or we're unhappy
  const cooldown = parseFloat(value);
  if (isNaN(cooldown) === true) {
    return;
  }

  // Based on the time unit, multiple the value on the way out.
  switch (unit) {
    case 's':
      return cooldown * 1000;

    case 'm':
      return cooldown * (1000 * 60);

    case 'h':
      return cooldown * (1000 * 60 * 60);

    default:
      api.log.error(`parseCooldownSpec is not properly handling the time unit '${unit}'`);
      return;
  }
}


// =============================================================================


/* Given a user level in numeric form, this will return back a human readable
 * representation of what that user level means, such as "broadcaster".
 *
 * This will always return a valid string, even if that string is a textual
 * string that indicates that the user level is not a valid, known level. */
function userLevelToString(userLevel) {
  return user_access_levels[userLevel] ?? 'unknown';
}


// =============================================================================


/* Given a textual user level, convert it into an appropriate integral value
 * and return it back.
 *
 * This accepts a wider range of inputs than that which is given out by
 * userLevelToString(), allowing for a more natural expression of potential
 * levels without requiring a direct match.
 *
 * If the input string is not a valid user level, this will return undefined. */
function stringToUserLevel(input) {
  return access_options[input.toLowerCase()];
}

// =============================================================================


/* Fetch a short list of representative access levels for display in places in
 * which we want to display access levels without using the larger, more
 * expanded list that contains many entries for each level. */
function getDisplayAccessLevels() {
  return [...access_options_short];
}


// =============================================================================


/* Given a string name of something that could be considered the name of a
 * command, alias or responder of some type (basically anything which, when
 * entered into the chat, does something special), return an indication of
 * whether that name is a valid name or not. */
function isValidCmdName(name) {
  return name !== undefined && command_prefix_list.indexOf(name[0]) !== -1;
}


// =============================================================================


/* Given the potential name for a command, check to see if the name is valid and
 * if it's not, adjust it and return a version that is valid.
 *
 * The things that make a command name valid are:
 *    - starts with a valid prefix character. */
function getValidCmdName(api, name) {
  if (name !== undefined && isValidCmdName(name) === false) {
    name = `${api.config.get('bot.defaultPrefix')}${name}`
  }

  return name;
}

// =============================================================================


/* This takes an object that contains field changes that should be applied to
 * the item provided, and updates the record in the database using the model
 * provided and those changes.
 *
 * This only touches the fields provided and leaves everything else alone. It
 * also updates the passed in item to have the changes, so that keeping sync
 * with the database is easier. */
async function persistItemChanges(api, modelName, item, changes) {
  // Get the appropriate model and then perform the update
  const model = api.db.getModel(modelName);
  await model.update({ id: item.id }, changes);

  // Apply the same changes directly to the item so that the caller doesn't
  // need to refresh or reload to see them.
  Object.keys(changes).forEach(key => item[key] = changes[key]);
}


// =============================================================================


module.exports = {
  command_prefix_list,
  getAuthProvider,
  dedent,
  usage,
  cooldownToString,
  stringToCooldown,
  userLevelToString,
  stringToUserLevel,
  getDisplayAccessLevels,
  isValidCmdName,
  getValidCmdName,
  persistItemChanges
}