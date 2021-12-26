// =============================================================================


const { isValidCmdName } = require('../../utils');


// =============================================================================


/* This class wraps the results of parsing an incoming Twitch message from the
 * chat into a command and it's arguments.
 *
 * When the line represents a command, the name of the command is stored, and
 * the text is parsed out into a list of key=value parameters and the remaining
 * text as both a single string and separated out into a list of words.
 *
 * If the line is not a command, the command name and parameters will be empty,
 * leaving just the whole line of text as an array and as a string. In this
 * case the line and the text will be the same. */
class CommandDetails {
    // The original line as provided to the constructor.
    line;

    // The text of the original line, with the command and any command arguments
    // removed from it. The text version is the text as a string; the words is
    // the same text, split into a list of words.
    text;
    words;

    // The name of the command; this is the empty string if this does not
    // represent a command.
    name;

    // The parameters to the command stored as a Map, which are specified as
    // key=value pairs at the start of the incoming text. If name is the empty
    // string, this map will be empty.
    params;

    ////////////////////////////////////////////////////////////////////////////
    // The remaining properties here are assigned values at the point where an
    // actual message is being dispatched as a command, since they require
    // information from external sources in order to be populated.
    ////////////////////////////////////////////////////////////////////////////

    // Is this command being invoked as an alias of another command or as a
    // native command?
    isAlias;

    // The channel the command was invoked inside of.
    channel;

    // The raw Twitch message provided by the Twurple Twitch chat library we're
    // using, which provides access to many details about the message such as
    // bits and emotes used in the message.
    rawMsg;

    constructor(line, name, params, text, words) {
      this.line = line;
      this.name = name;
      this.params = params;

      this.isAlias = false;
      this.channel = undefined;
      this.rawMsg = undefined;

      this.text = text;
      this.words = words;
    }
}


// =============================================================================


/* Parse an incoming chat message into a potential command, it's arguments and
 * the remaining trailing text.
 *
 * To be considered as a command, the line must start with a word that is
 * prefixed with one of the valid command prefix characters; anything else will
 * be considered just a line of normal text.
 *
 * The command may take any number of optional parameters in the form of
 * 'parm=value'; these must all occur immediately after the command name and be
 * separated from each other with whitespace.
 *
 * Everything following the command name and the optional paramters is
 * considered to be the trailing text, and is provided both as a single string
 * of text as well as that same text split into words, since this is a common
 * requirement of a command. */
class CommandParser {
    constructor() {
    }

    /* Parse an incoming message into a command name, parameters and trailing
     * text by returning an instance of the CommandDetail class.
     *
     * For any input line that is not recognized as a command, the returned
     * details object will not contain any parameters or a command name, making
     * it easy to detect this situation. */
    parse(message) {
      // Tokenize the original message into words. The first word is the name
      // of the command, and the remainder are potential arguments.
      let [name, ...parts] = message.split(/ +/).map(s => s.trim()).filter(s => s !== '');
      const params = new Map();

      // If the name of the command has a valid prefix, parse the potential
      // arguments out of the incoming parts of the text.
      //
      // When the command has no valid prefix, put it back into the parts
      // array and turn it into the empty string.
      if (name !== undefined && isValidCmdName(name) === true) {
        // As long as the first word in the parts list is a potential key/value
        // pair, remove it and add it to the parameter list.
        while (parts.length !== 0 && parts[0].indexOf('=') !== -1) {
          const [key, ...value] = parts.shift().split('=');
          params.set(key, value.join('='));
        }
      } else {
        // The command does not have a valid prefix; put the command name
        // back into the parts list and redact it.
        parts.splice(0, 0, name);
        name = '';
      }

      return new CommandDetails(message, name, params, parts.join(' '), parts);
    }
}


// =============================================================================


module.exports = {
  CommandDetails,
  CommandParser
};


// =============================================================================
