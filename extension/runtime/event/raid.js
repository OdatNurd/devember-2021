// =============================================================================


/* This event handler tracks an incoming raid event, telling us who is raiding
 * and how many viewers they brought with them on the raid.
 *
 * Confusingly, the API contains two different versions of listeners for this,
 * which seem to do the same thing behind the scenes, though it is not explained
 * in the library documentation why this is the case. */
function raid(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info(`${event.raidingBroadcasterDisplayName} is raiding with a party of ${event.viewers}`);
  api.chat.say(`Thanks so much @${event.raidingBroadcasterDisplayName} for bringing in ${event.viewers} new victims.. err.. visitors!`);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      raid
    };
  },

  unload: async api => {
  }
};
