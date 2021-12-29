// =============================================================================


/* This event handler tracks an incoming raid event, telling us who is raiding
 * and how many viewers they brought with them on the raid. */
function incoming_raid(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info(`${event.raidingBroadcasterDisplayName} is raiding with a party of ${event.viewers}`);
  api.chat.say(`Thanks so much @${event.raidingBroadcasterDisplayName} for bringing in ${event.viewers} new victims.. err.. visitors!`);
}


// =============================================================================


/* This event handler tracks an outgoing raid, telling us who is iniitated the
 * raid, who is being raided, and how many people are going in the raid. */
function outgoing_raid(api, name, event) {
  api.log.info(`${name} = ${JSON.stringify(event, null, 2)}`);
  api.log.info(`${event.raidingBroadcasterDisplayName} is raiding out to ${event.raidedBroadcasterName} with a party of ${event.viewers}`);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      raidIn: incoming_raid,
      raidOut: outgoing_raid,
    };
  },

  unload: async api => {
  }
};
