
// =============================================================================


/* This schema is used to represent commands that are available to the bot,
 * which uses a dynamic command system instead of a hard coded list of potential
 * commands.
 *
 * All commands carry a set of common properties that allows us to know in
 * what file they are implemented, who can run them, and so on.
 *
 * The dynamic command system allows for commands to be individually enabled
 * or disabled, aliases, access controlled and hot reloaded. */
const CommandSchema = {
  // Unique ID for this particular command
  id: 'increments',

  // The command name and the aliases that it can be known by (which can be an
  // empty list). All commands must have unique names. The name of commands
  // and the aliases for them must always include a valid command prefix.
  name: { type: String, unique: true, nullable: false },
  aliases: { type: Array, defaultsTo: [] },

  // Wether this command is enabled or not. Disabled commands cannot be
  // executed by anyone, regardless of circumstance.
  enabled: { type: Boolean, defaultsTo: 1 },

  // The file that is expected to contain the implementation of this command.
  // This should be a relative path name; the bot will ensure that it's loaded
  // from the correct location.
  sourceFile: { type: String, nullable: false },

  // Marks this command as a core command. This can be used by any parts of the
  // bot system to know if a particular command is something that is core to the
  // underlying command system or not.
  //
  // This can be used for any purpose, such as redacting such commands from the
  // list of commands presented, stopping them from being hot loaded, etc.
  //
  // Currently, nothing takes advantage of this.
  core: { type: Boolean, defaultsTo: 0 },

  // Wether this command is hidden or not. Hidden commands are not displayed
  // by commands that visually display the command list.
  hidden: { type: Boolean, defaultsTo: 0 },

  // The access level required to execute this command. User access levels
  // must be equal to or lower than the value here to be able to execute the
  // command.
  //    0: isBroadcaster
  //    1: isMod
  //    2: isVip
  //    3: isRegular
  //    4: isSubscriber
  //    5: isEveryone
  userLevel: { type: Number, defaultsTo: 0 },

  // When non zero, this is the amount of time in milliseconds that must
  // elapsed between invocations of this command. Within the cooldown period,
  // the command is silently dropped.
  //
  // Moderators and the Broadcaster are exempt from the cooldown period and
  // may always execute a command even if it's in cooldown.
  cooldown: { type: Number, defaultsTo: 0 }
};


// =============================================================================


module.exports = {
  CommandSchema
};
