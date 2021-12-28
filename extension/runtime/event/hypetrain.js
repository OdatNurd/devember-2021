// =============================================================================


/** *****************************************************************************
 * NOTE: Twitch does not guarantee that events are triggered in any given order
 *       (and may in fact trigger the same event more than once, if it thinks
 *       you never got it).
 *
 *       The implications for that here is that it's entirely possible to
 *       receive a progress event for a train before ever being told that it is
 *       actually beginning.
 *
 *       As such, code to handle these needs to be smart enough to know when
 *       this might be occurring. */

/* This event triggers when a hype train is initially starting, providing
 * information on some of the events that triggered the train to begin. */
function hype_train_begin(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('A hype train is starting');
}


// =============================================================================


/* This event triggers when a hype train is in progress and someone does
 * something that increases the progress of the train. */
function hype_train_update(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('Status of the hype train changed');
}


// =============================================================================


/* This event triggers when a hype train is finalized, providing information on
 * the last items that contributed to the train before it ended.
 *
 * From appearances in the event object, nothing in here indicates the overall
 * train level other than knowing a set list of "points" that were being worked
 * toward. */
function hype_train_end(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('A hype train just ended');
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      hypeBegin: hype_train_begin,
      hypeUpdate: hype_train_update,
      hypeEnd: hype_train_end
    };
  },

  unload: async api => {
  }
};
