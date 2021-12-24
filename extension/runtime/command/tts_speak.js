
// =============================================================================


const { usage } = require('../../utils');


// =============================================================================


/* This command interfaces with the Text-To-Speech functionality (if it is
 * currently configured to be available), and has the ability to both change the
 * configuration of the TTS module to change the queries that are made, as well
 * as accepting text and triggering a request.
 *
 * In practice, this queues up the job, gives the job ID to the overlay, and
 * then the tts module does the request and sends the audio data back to the
 * overlay, which plays it. */
function tts_speak(api, cmd, userInfo) {
  if (cmd.words.length === 0) {
    api.chat.say(`current tts config is: ${api.shared.ttsConfig.language} -
      ${api.shared.ttsConfig.gender} - ${api.shared.ttsConfig.voice} ; change
      with: ${cmd.name} [voice=*] [gender=*] [language=*] or provide some text
      to speak`);
  }

  // The string can start with configuration items that change
  // the voice used; these will remain in effect until the bot
  // gets restarted,.
  for (const key of ['voice', 'gender', 'language']) {
    if (cmd.params.has(key)) {
      api.shared.ttsConfig[key] = cmd.params.get(key);
    }
  }

  api.tts.speak(cmd.text, api.shared.ttsConfig);
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
    // Set up a shared object that will track the TTS configuration as used by
    // this command. This is distinct from the configuration used by other TTS
    // items, such as the dashboard, which have their own controls.
    api.shared.ttsConfig = {
      language: api.config.get('tts.language'),
      voice: api.config.get('tts.voice'),
      gender: api.config.get('tts.gender')
    };
    return {
      '$tts': tts_speak
    };
  },

  /* Tear down any global state that no longer needs to be saved when the
   * file is unloaded. This should clean up any resources that are no longer
   * needed, but it's also possible for the 'api.shared' table to persist
   * information across a reload, for example. */
  unload: async api => {
    // We could delete or reset the ttsConfig here; by not doing so, the
    // configuration will persist across hot reloads of this file (though not
    // bot inovations).
  }
};
