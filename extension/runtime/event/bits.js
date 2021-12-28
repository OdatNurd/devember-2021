// =============================================================================


/* This is the event handler for a cheer, indicating that someone is using bits
 * in the channel. */
function bit_donation(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info(`${event.userName || 'Anonymous'} just cheered ${event.bits} bits!`);
  api.log.info(`${event.message}`);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      cheer: bit_donation
    };
  },

  unload: async api => {
  }
};
