// =============================================================================


// The panel has input buttons and forms that can be used to make the bot say
// text or do actions. Grab the appropriate elements.
const form = document.getElementById('bot-speak');
const text = document.getElementById('text-to-say');
const language = document.getElementById('text-language');
const gender = document.getElementById('text-gender');
const voice = document.getElementById('text-voice');


// =============================================================================


// Respond to submitting the form by sending text to the chat via a message.
form.addEventListener('submit', e => {
  e.preventDefault();
  nodecg.sendMessage('trigger-tts', {
    text: text.value,
    language: language.value,
    gender: gender.value,
    voice: voice.value,
  });
  text.value = '';
});


// =============================================================================
