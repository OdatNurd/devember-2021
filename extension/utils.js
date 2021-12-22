
// =============================================================================


/* This sends usage information for the given command out to the channel chat.
 * The name of the command comes from the passed in command details, along with
 * the signature and a longer description of what the command actually does. */
function usage(api, cmd, signature, description) {
    api.chat.say(`Usage: ${cmd.name} ${signature} - ${description.replace(/\s+/g, ' ').trim()}`);
}


// =============================================================================


module.exports = {
    usage
}