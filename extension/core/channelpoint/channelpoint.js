// =============================================================================


const { CodeHandler } = require('../handler');


// =============================================================================


/* This subclass of the CodeHandler handles the specific case of handlers
 * related to channel point redemptions. This is actually a special sub-case of
 * events, in that it is an event that tells us that a redeem has happened, and
 * we use an item like this to associate the handler for a redeem with the item.
 *
 * As such, there is no permissioning or cool down here either much like events,
 * because Twitch takes care of that for us. */
class BotChannelRedemption extends CodeHandler {
  // Construct a new instance of the class based on the configuration provided.
  constructor(config) {
    super(config);
  }

  /* Apply the given database configuration record to this instance of the
     * class */
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
  BotChannelRedemption
};
