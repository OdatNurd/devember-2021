// =============================================================================


// The panel has input buttons and forms that can be used to make the bot say
// text or do actions. Grab the appropriate elements.
const form = document.getElementById('bot-speak');
const text = document.getElementById('text-to-say');
const language = document.getElementById('text-language');
const gender = document.getElementById('text-gender');
const voice = document.getElementById('text-voice');


// =============================================================================


// Make a request to the back end to ask it for all of the various TTS voices
// that are supported by the back end; we use this to populate our select
// fields.
const fetchVoices = async () => {
  try {
    const data = await fetch('/tts/voices/');
    if (data.ok === false) {
      throw new Error(`Request for voices failed`);
    }

    return data.json();
  }
  catch (err) {
    nodecg.log.error(`Error fetching voices: ${err}`);
  }
}


// =============================================================================


// Respond to submitting the form by sending a message that tells the back end
// to speak the text. This will cause it to send the TTS overlay a message that
// gets it to actually make the final request.
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


// This will update the contents of the voice select box so that it contains
// only items for the given language and of the given gender.
//
// This is called both at startup to set the initial values as well as every
// time one of the select boxes changes.
function filterVoiceList(language, gender, voiceData) {
  // Filter the voice data down to the list of voices that apply to the critera
  // that we were given, and create option tags out of them for insertion into
  // the parent.
  const voices = voiceData.filter(e => e.language === language && e.gender === gender)
                    .map(e => {
                      const tag = document.createElement('option');
                      tag.value = e.voice;
                      tag.innerText = e.name;

                      return tag;
                    });

  // Remove any items that might currently exist in the voice select, then add
  // in all of the new items.
  voice.innerHTML = '';
  voice.append(...voices);
}


// =============================================================================


// Do the initial setup for the drop lists in the page, which will query the
// list of voices that can be used, set up event handlers on the selects to make
// the contents of the voice dropbox filter as things change, and do an initial
// filter to populate the voice box.
async function setupDropLists() {
  // Fetch down the list of available voices, which we use to populate the items
  // in the dropdown boxes.
  const voiceData = await fetchVoices();

  // Filter the contents of the voice dropdown based on the current value of the
  // language and gender select fields.
  const doFilter = () => filterVoiceList(language.value, gender.value, voiceData);

  // When the language and gener change, re-filter the voice list to contain
  // only the appropriaet items.
  language.addEventListener('change', e => doFilter());
  gender.addEventListener('change', e => doFilter());

  // Do an initial filter on the list to give it values based on the current
  // defaults in the select fields.
  doFilter();
}


// =============================================================================


// Set up the page.
setupDropLists();