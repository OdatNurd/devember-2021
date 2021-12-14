'use strict';


// =============================================================================


function debug_command(api, details, userInfo) {
  // Alias the raw message, which comes in the details. This makes the following
  // code more concise.
  const { rawMsg } = details;

  const chatUser = rawMsg.userInfo;
  const rawParts = rawMsg.parseEmotes();

  // Display the details about the incoming message and how we parsed it.
  api.log.info(details);

  // Display standard message fields from Twitch.
  api.log.info(`bits: ${rawMsg.bits}`);
  api.log.info(`channelId: ${rawMsg.channelId}`);
  api.log.info(`id: ${rawMsg.id}`);
  api.log.info(`isCheer: ${rawMsg.isCheer}`);
  api.log.info(`emoteOffsets: ${rawMsg.emoteOffsets.size}`);

  // For any message that contains emotes, the chat library parses them out for
  // us. This gives us the positions and ID's of each emote used.
  //
  // For example:
  //    -> 306898603: ["0-9","22-31"]
  //    -> 307723742: ["11-20"]
  for (const [key, value] of rawMsg.emoteOffsets) {
    api.log.info(` -> ${key}: ${JSON.stringify(value)}`);
  }

  // This splits the text out into emotes and text, splitting into
  // objects that have a type of "text" or "emote" and other fields.
  // This does not capture bits, though there is an API endpoint for that
  // which is similar and requires an extra argument.
  //
  // Text in here is not stripped, so "!drop " would appear for the first
  // item if there is an emote in the second position.
  api.log.info(`${JSON.stringify(rawParts, null, 2)}`);

  // Information on the user that invoked the command.
  api.log.info('==================');
  api.log.info(`userId: ${chatUser.userId}`);
  api.log.info(`userName: ${chatUser.userName}`);
  api.log.info(`displayName: ${chatUser.displayName}`);
  api.log.info(`userType: ${chatUser.userType}`);
  api.log.info(`color: ${chatUser.color}`);

  api.log.info(`isBroadcaster: ${chatUser.isBroadcaster}`);
  api.log.info(`isMod: ${chatUser.isMod}`);
  api.log.info(`isSubscriber: ${chatUser.isSubscriber}`);
  api.log.info(`isFounder: ${chatUser.isFounder}`);
  api.log.info(`isVip: ${chatUser.isVip}`);

  // Display the badge information for the user that sent the
  // This is a map where the key is a type of badge (like subscriber)
  // and the value is information on that badge:
  //     -> subscriber: "4"
  api.log.info(`badgeInfo: ${chatUser.badgeInfo.size}`);
  for (const [key, value] of chatUser.badgeInfo) {
    api.log.info(` -> ${key}: ${JSON.stringify(value)}`);
  }

  // This is a map where the key is a type of badge and the value is
  // whether or not it exists; this seems to perhaps be what the helper
  // methods above get us easier:
  //     -> moderator: "1"
  //     -> partner: "1"
  api.log.info(`badges: ${chatUser.badges.size}`);
  for (const [key, value] of chatUser.badges) {
    api.log.info(` -> ${key}: ${JSON.stringify(value)}`);
  }

  api.log.info('==================');
}


// =============================================================================


module.exports = {
  load: async api => {
    return {
      '$debug': debug_command
    };
  },

  unload: async api => {
  }
};
