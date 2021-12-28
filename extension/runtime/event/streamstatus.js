// =============================================================================


/* This is the event handler for knowing when the stream status is changing from
 * offline to online or vice versa. This is two different events, but they're
 * handled here in a single handler via an alias; use the name of the event to
 * know which way the state is going. */
function stream_online_status(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info(`Stream status notification: ${name}`);
}


// =============================================================================


/* This is the event handlers for knowing when the meta information about the
 * stream is being modified, such as the title changing. */
function stream_update(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('The information for the stream just changed');
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      streamOnline: stream_online_status,
      update: stream_update
    };
  },

  unload: async api => {
  }
};
