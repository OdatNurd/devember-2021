// =============================================================================


/* This is the event handler for tracking when a user is banned or unbanned.
 * The same handler is used for both events via an alias; use 'name' to know
 * whether the event is triggering for one or the other. */
function ban_unban(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('Someone just got banned or unbanned');
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      ban: ban_unban
    };
  },

  unload: async api => {
  }
};
