// =============================================================================


// The panel has input buttons and forms that can be used to make the bot say
// text or do actions. Grab the appropriate elements.
const form = document.getElementById('bot-speak');
const text = document.getElementById('text-to-say');
const method = document.getElementById('text-send-method');


// =============================================================================


// Respond to submitting the form by sending text to the chat via a message.
form.addEventListener('submit', e => {
  e.preventDefault();
  nodecg.sendMessage(method.value, text.value);
  text.value = '';
});


// =============================================================================
