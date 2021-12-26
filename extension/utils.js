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
 * If the incoming string is not in a recognized format, undefined will be
 * returned; otherwise the time in milliseconds is returned. */
function stringToCooldown(api, spec) {
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


module.exports = {
  dedent,
  usage,
  cooldownToString,
  stringToCooldown,
  userLevelToString,
  stringToUserLevel
}