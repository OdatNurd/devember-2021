// =============================================================================


/* This event triggers whenever a poll is started in the channel; this includes
 * information on the items that were added to the poll, along with it's
 * configuration, such as whether you can vote with bits and/or channel
 * points. */
function poll_begin(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('A poll is beginning in the channel');
}


// =============================================================================


/* This event triggers whenever a poll is concluded in the channel; the message
 * includes the underlying poll information and also indicates the votes for
 * each item. */
function poll_end(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('A poll is ending in the channel');
}


// =============================================================================


/* This event triggers while a poll is running and someone votes; the data
 * provided indicates the new state of things. */
function poll_update(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('Someone has voted on a poll in the channel');
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      pollBegin: poll_begin,
      pollEnd: poll_end,
      pollUpdate: poll_update
    };
  },

  unload: async api => {
  }
};
