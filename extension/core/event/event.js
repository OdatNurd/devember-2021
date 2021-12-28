
// =============================================================================


const { CodeHandler } = require('../handler');


// =============================================================================


/* This subclass of the CodeHandler handles the specific case of handlers
 * related to Twitch EventSub events in the bot; These are not as complicated as
 * commands are, since there is no notion of things like access levels or a cool
 * down between events. */
class BotEvent extends CodeHandler {
  // Construct a new instance of the class based on the configuration provided.
  constructor(config) {
    super(config);
  }

  /* Apply the given database configuration record to this instance of the
     * class. */
  applyConfig(config) {
    this.id = config.id;
    this.name = config.name;
    this.aliases = config.aliases;
    this.enabled = config.enabled;
    this.sourceFile = config.sourceFile;
  }
}

// =============================================================================


module.exports = {
  BotEvent
};
