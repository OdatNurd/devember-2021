
// =============================================================================


const { usage } = require('../../utils');


// =============================================================================


/* This command triggers the drop game running in the overlay, providing the
 * name of the user doing the drop, optionally also the ID of the emote that was
 * used.
 *
 * The overlay will use this to enable the game if it's not currently running,
 * generate a new dropper, and launch it. */
function drop_cmd(api, cmd, userInfo) {
  // Parse the raw message to get things like the emotes out.
  const rawParts = cmd.rawMsg.parseEmotes();

  // If there are at least two parts to the message and the second
  // one is an emote and it's name is the second word from the
  // message, then the emote to use is the ID of that emote.
  const emoteId = (rawParts.length >= 2 && rawParts[1].type === 'emote' && rawParts[1].name === cmd.words[0]) ? rawParts[1].id : undefined;

  api.nodecg.sendMessage('drop-game-drop', {
    name: userInfo.displayName,
    emoteId
  });
}


// =============================================================================


/* This command sends a message to the dropper overlay asking it to cut the
 * chute of the active dropper for the user that invokes the command. */
function cut_cmd(api, cmd, userInfo) {
  api.nodecg.sendMessage('drop-game-cut', userInfo.displayName);
}


// =============================================================================


/* This command sends a message to the dropper overlay asking it to get rid of
 * the dropper for the named user, if it happens to be sitting on the target.
 * This allows such a user to do another drop, trying to better their score, at
 * the risk of scoring lower. */
function abdicate_cmd(api, cmd, userInfo) {
  api.nodecg.sendMessage('drop-game-abdicate', userInfo.displayName);
}


// =============================================================================


/* This functions as the !drop command and simulates the bot having triggered
 * the command. */
function bdrop_cmd(api, cmd, userInfo) {
  api.nodecg.sendMessage('drop-game-drop', {
    name: api.chat.client.currentNick,
    emote: undefined
  });
}


// =============================================================================


/* This functions as the !cut command and simulates the bot having triggered
 * the command. */
function bcut_cmd(api, cmd, userInfo) {
  api.nodecg.sendMessage('drop-game-cut', api.chat.client.currentNick);
}


// =============================================================================


/* This functions as the !abdicate command and simulates the bot having triggered
 * the command. */
function babdicate_cmd(api, cmd, userInfo) {
  api.nodecg.sendMessage('drop-game-abdicate', api.chat.client.currentNick);
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
    // Create and store a dropper function to be used to handle incoming
    // drop messages from the overlay. This creates a closure over the API
    // (which is otherwise not available in the message result), allowing
    // the handler to interact with the bot subsystems.
    api.shared.dropHandler = result => {
      api.log.info(`Drop result: ${JSON.stringify(result, null, 2)}`);

      let resultMsg = '';

      // The bot not landing on the target is the only time that we display a
      // message about someone not landing within the landing zone. Otherwise
      // the chat gets spammed like crazy.
      if (result.onTarget === false && result.name === api.chat.client.currentNick) {
        resultMsg = 'NOOOOOO! :(';
      }

      // When someone is a winner, display a message in the chat that indicates
      // what their score is. This should only happen when someone actively gets
      // a higher score; landing on the target when there's someone there
      // already but their score is higher than yours should have no reaction
      // whatsoeer.
      if (result.winner === true) {
        if (result.name === api.chat.client.currentNick) {
          resultMsg = `I DID IT! I SCORED!!! New score to beat is ${result.score.toFixed(2)}! :D`;
        } else {
          resultMsg = `${result.name} just scored a ${result.score.toFixed(2)} and took the lead`;
        }
      } else {
        // In here, this is representing someone who's not on the target. For
        // our purposes here this only displays a message if the reason the
        // dropper left the target was a manual operation; it doesn't trigger
        // for people that hit the target but got a lower score.
        if (result.voluntary === true) {
          resultMsg = `${result.name} has graciously abdicated their position on the leaderboard.`;
        }
      }

      if (resultMsg !== '') {
        api.chat.say(resultMsg);
      }
    };

    // Listen for incoming requests at the stored handler.
    api.nodecg.listenFor('drop-game-drop-result', api.shared.dropHandler);

    return {
      '$drop': drop_cmd,
      '$cut': cut_cmd,
      '$abdicate': abdicate_cmd,
      '$bdrop': bdrop_cmd,
      '$bcut': bcut_cmd,
      '$babdicate': babdicate_cmd
    };
  },

  /* Tear down any global state that no longer needs to be saved when the
   * file is unloaded. This should clean up any resources that are no longer
   * needed, but it's also possible for the 'api.shared' table to persist
   * information across a reload, for example. */
  unload: async api => {
    // Remove the listener we set up when we were loaded, then remove it
    // from the storage.
    api.nodecg.unlisten('drop-game-drop-result', api.shared.dropHandler);
    api.shared.dropHandler = undefined;
  }
};
