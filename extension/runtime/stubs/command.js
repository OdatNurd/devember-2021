'use strict';


// =============================================================================


const { usage } = require('../../utils');


// =============================================================================


/* This function implements the stub command. The bot API is available via api,
 * cmd is the details of the parsed command that is being executed, and userInfo
 * is the user that executed the command. */
function stub_cmd(api, cmd, userInfo) {
  if (cmd.words.length === 0) {
    return usage(api, cmd, '<arg1> [arg2]', `does something with the two
      given arguments, which is probably quite intereting.`);
  }

  api.log.info('I am a stub command');
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
      '$stub': stub_cmd
    };
  },

  /* Tear down any global state that no longer needs to be saved when the
   * file is unloaded. This should clean up any resources that are no longer
   * needed, but it's also possible for the 'api.shared' table to persist
   * information across a reload, for example. */
  unload: async api => {
  }
};
