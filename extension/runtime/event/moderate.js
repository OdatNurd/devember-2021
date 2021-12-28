// =============================================================================


/* This event triggers whenever a moderator is added to or removed from the
 * channel. The same handler is used for both, with only an aliased name being
 * used to ponit the removal here.
 *
 * To know which of the two operations is being undertaken, checkl the name. */
function moderator_update(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('A moderator is being added or removed');
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      moderator_add: moderator_update
    };
  },

  unload: async api => {
  }
};
