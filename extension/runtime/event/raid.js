// =============================================================================


const { displayEventDetails } = require('../../event_list');


// =============================================================================


/* This event handler tracks an incoming raid event, which tells you when the
 * channel is being raided, by whom, and how many people came in as a part of
 * the raid. */
function incoming_raid(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);

  // As an example of something that could be done, in response to an incoming
  // raid, look up the shoutout command and, if found, execute it as if the
  // broadcaster manually invoked it.
  //
  // This could also be done after a short delay to take advantage of not having
  // the shout out conflict with any raid notifications or ads that the raiders
  // may be stuck behind.

  // // Check to see if there's a shoutout command, and if so, auto shout-out
  // // people when they raid.
  // const cmd = api.commands.find('$so');
  // if (cmd !== null) {
  //   // Parse a fake message that looks like someone is trying to should out the
  //   // broadcaster that just raided, and then invoke the command.
  //   //
  //   // Here we use a fake user that has just enough fields for the command to
  //   // treat the access level as broadcaster, who always has access to all
  //   // commands that are enabled.
  //   const details = api.cmdParser.parse(`${cmd.name} @${event.raidingBroadcasterName}`);
  //   cmd.execute(api, details, {isBroadcaster: true});
  // }
}


// =============================================================================


/* This event handler tracks an outgoing raid event, which tells you when the
 * broadcaster of the channel raids out to some other channel, and indicates who
 * is being raided and how many people are going along as part of the raid. */
function outgoing_raid(api, name, event) {
  // Display the properties of the event, for debug purposes.
  displayEventDetails(api, name, event);
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      raid_in: incoming_raid,
      raid_out: outgoing_raid,
    };
  },

  unload: async api => {
  }
};
