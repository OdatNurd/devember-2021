'use strict';


// =============================================================================


const { CodeHandler } = require('../handler');


// =============================================================================


/* This special subclass of the CodeHandler class is used to handle text
 * responders, which are special commands which, when used, get the bot to say
 * a predefined segment of text. Such items are commonly used for things such
 * as responding to common questions and the like.
 *
 * This particular subclass has a built in handler that causes the bot to
 * respond with text; so unlike commands there is no associated source file
 * field. */
class TextResponder extends CodeHandler {
  // The time this responder was last triggered; null indicates never triggered.
  //
  // If there is a cool down in effect, the current time must be that many
  // milliseconds past this time to allow the responder to be triggered again
  // (except that the broadcaster and mods are always allowed).
  lastRun = null;

  // Construct a new instance of the class based on the configuration
  // provided.
  constructor(config) {
    super(config);
  }

  /* Apply the given database configuration record to this instance of the
   * class */
  applyConfig(config) {
    this.id = config.id;
    this.name = config.name;
    this.aliases = config.aliases;
    this.userLevel = config.userLevel;
    this.cooldown = config.cooldown;
    this.text = config.text;

    // Set our hadler specifically to the hard coded responser method.
    this.handler = this.respond;

    // When a new configuration is applied to an existing instance, reset
    // the last run time.
    this.lastRun = null;
  }

  /* The handler that is invoked whenever the responder is triggered by a user
   * in the chat. This is hard coded to always speak the text from this entry,
   * and does not need to do any validation because the infrastructure ensures
   * that the cooldown has expired and that the provided user has access to
   * do it. */
  respond(api, userInfo) {
    api.chat.say(this.text);
  }

  /* Indicates if this responder can be triggered or not, given the information
   * provided. This automatically takes into account things like the access
   * level of the user and any cool down period that may be in effect. */
  can_execute(api, userInfo) {
    // If the super implementation says that this handler cannot be
    // executed, then leave now.
    if (super.can_execute(api, userInfo) === false) {
      return false;
    }

    // Get the effective user access level for the user that is triggering the
    // responder. The level needs to be at or lower than the level set for this
    // responder to allow is to trigger.
    const effectiveLevel = api.getUserLevel(api, userInfo);
    if (effectiveLevel > this.userLevel) {
      api.log.warn(`-> ${this.name} cannot trigger; access denied`);
      return false;
    }

    // If there is a cool down currently in effect and it has not been exceeded
    // yet, the responder cannot trigger.
    //
    // The cool down does not apply to the broadcaster or to moderators, who
    // should always have the ability to access a command.
    if (this.cooldown !== 0 && effectiveLevel > 1 && new Date().getTime() - (this.lastRun ?? 0) < this.cooldown) {
      api.log.warn(`-> ${this.name} cannot trigger; in cool down`);
      return false;
    }

    return true;
  }

  /* Attempt to trigger the provided response handler; this first checks to see
   * if the responder can actually be triggered, which may block the execution
   * from happening. */
  execute(api, userInfo) {
    // Ask the super to execute the handler; if it succeeds then reset the
    // time of the last run.
    if (super.execute(api, userInfo) === true) {
      this.lastRun = new Date().getTime();
    }
  }
}


// =============================================================================


module.exports = {
  TextResponder
};
