// =============================================================================


/* This event triggers whenever a prediction starts in the channel. Like a
 * poll, this provides the configuration information on the items in the
 * prediction. */
function prediction_begin(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('A prediction is starting');
}


// =============================================================================


/* This event triggers whenever a prediction ends in the channel. Like a poll,
 * this provides information on which of the options was selected as the outcome
 * of the prediction. */
function prediction_end(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('A prediction is ending');
}


// =============================================================================


/* It's unclear when this event triggers or what it's for, since the Twitch CLI
 * can't generate it for testing and the documentation is a bit unclear. */
function prediction_lock(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('A prediction has been locked');
}


// =============================================================================


/* This event triggers whenever anyone adds channel points to a currently
 * running prediction in the channel. This gives us the new channel point totals
 * for the options. */
function prediction_update(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info('A prediction is being updated');
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      predictionBegin: prediction_begin,
      predictionEnd: prediction_end,
      predictionLock: prediction_lock,
      predictionUpdate: prediction_update
    };
  },

  unload: async api => {
  }
};
