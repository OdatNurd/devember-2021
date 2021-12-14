'use strict';


// =============================================================================


const { CodeHandler } = require('../handler');


// =============================================================================


/* This subclass of the CodeHandler handles the specific case of handlers
 * related to commands in the bot; this includes things like making sure that
 * the user trying to invoke the command has permissions, enforcing cool downs,
 * and so on. */
class BotCommand extends CodeHandler {
  // The time this command was last invoked; null indicates never executed.
  //
  // If there is a cool down in effect, the current time must be that many
  // milliseconds past this time to allow the command to be invoked again
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
    this.core = config.core;
    this.enabled = config.enabled;
    this.hidden = config.hidden;
    this.userLevel = config.userLevel;
    this.cooldown = config.cooldown;
    this.sourceFile = config.sourceFile;

    // When a new configuration is applied to an existing instance, reset
    // the last run time.
    this.lastRun = null;
  }

  /* Indicates if this command can be executed or not, given the information
   * provided. This automatically takes into account things like the access
   * level of the user and any cool down period that may be in effect. */
  can_execute(api, details, userInfo) {
    // If the super implementation says that this handler cannot be
    // executed, then leave now.
    if (super.can_execute(api, details, userInfo) === false) {
      return false;
    }

    // If this command was defined to only be executed by bot installations
    // in a specific role, or a default role for all commands was set, then
    // verify that this installation should actually allow the command to
    // execute or not.
    const effectiveRole = details.params.get('role') || api.defaultCmdRole;
    if (effectiveRole !== undefined && effectiveRole !== api.role) {
      api.log.warn(`-> ${this.name} cannot execute; directed to role ${effectiveRole} only`);
      return false;
    }

    // Get the effective user access level for the user that is executing
    // the command. The level needs to be at or lower than the level set for
    // this command to allow execution.
    const effectiveLevel = api.getUserLevel(api, userInfo);
    if (effectiveLevel > this.userLevel) {
      api.log.warn(`-> ${this.name} cannot execute; access denied`);
      return false;
    }

    // If there is a cool down currently in effect and it has not been
    // exceeded yet, the command cannot execute.
    //
    // The cool down does not apply to the broadcaster or to moderators, who
    // should always have the ability to access a command.
    if (this.cooldown !== 0 && effectiveLevel > 1 && new Date().getTime() - (this.lastRun ?? 0) < this.cooldown) {
      api.log.warn(`-> ${this.name} cannot execute; in cool down`);
      return false;
    }

    return true;
  }

  /* Attempt to execute the provided command handler; this first checks to see
   * if the command can actually be executed, which may block the execution
   * from happening. */
  execute(api, details, userInfo) {
    // Ask the super to execute the handler; if it succeeds then reset the
    // time of the last run.
    if (super.execute(api, details, userInfo) === true) {
      this.lastRun = new Date().getTime();
    }
  }
}


// =============================================================================


module.exports = {
  BotCommand
};
