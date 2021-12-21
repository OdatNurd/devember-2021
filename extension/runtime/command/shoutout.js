'use strict';


// =============================================================================


const { usage } = require('../../utils');


// =============================================================================


/* This function implements the stub command. The bot API is available via api,
 * cmd is the details of the parsed command that is being executed, and userInfo
 * is the user that executed the command. */
async function perform_shoutout(api, cmd, userInfo) {
  if (cmd.words.length < 1) {
    api.chat.say('I would love to shout someone out, but you forgot to tell me who');
    return;
  }

  // The first word in the command is the user; if they have the standar user
  // prefix, remove it.
  const user = (cmd.words[0][0] === '@' ? cmd.words[0].substr(1) : cmd.words[0]);

  // Get the user details for the user being shouted out.
  const userDetails = await api.twitch.users.getUserByName(user);
  if (userDetails !== null) {
    // Get the channel information for the user being shouted out.
    const channelInfo = await api.twitch.channels.getChannelInfo(userDetails.id);

    // Set up the stub message that will be displayed in the overlay and the message
    // that should be sent to the chat.
    let overlayMsg = 'You should check out the amazing %USERNAME%, who last streamed %GAME%!';
    let chatMsg = `You know who's super awesome? ${userDetails.displayName}! You should check them out at twitch.tv/${userDetails.name} , where they were last seen sharing ${channelInfo.gameName}!`;

    // If we were unable to look up the channel information for the user, we need
    // to adjust the messages accordingly.
    console.log(channelInfo.gameName);
    if (channelInfo === null || channelInfo.gameName === '') {
      overlayMsg = 'Check out the amazing %USERNAME%, who totally rocks ALL of the kasbahs!';
      chatMsg = `You know who's super awesome? ${userDetails.displayName}! You should check them out at twitch.tv/${userDetails.name} `;
    }

    // Get the bot to do the shoutout in the channel
    api.chat.say(chatMsg);

    // Send a shoutout message to the overlay browser source that's running in
    // OBS to tell it the text to display; it will kick off of the animation
    // once it's received.
    api.nodecg.sendMessage('shoutout', {
      msg: overlayMsg,
      username: userDetails.displayName,
      game: channelInfo === null ? '' : channelInfo.gameName,
      url: userDetails.profilePictureUrl
    });
  } else {
    api.chat.say(`Who be ${user}? Surely not someone twitch knows...`);
  }
}


// =============================================================================


/* Every command handler must export an object with a load and unload function,
 * which are used to set up and tear down any state that the commands in this
 * file need to run (if any). */
module.exports = {
  /* Set up any state required for the commands in this file to execute, and
   * return back a mapping between the commands implemented here and the
   * functions that implement them.  */
  load: async api => {
    // The api.shared table can be used to set up arbitrary data that is shared
    // between the commands in this file and commands in other files, if
    // desired.
    //
    // api.shared.mydata = {}
    return {
      '$shoutout': perform_shoutout
    };
  },

  /* Tear down any global state that no longer needs to be saved when the
   * file is unloaded. This should clean up any resources that are no longer
   * needed, but it's also possible for the 'api.shared' table to persist
   * information across a reload, for example. */
  unload: async api => {
  }
};
