// =============================================================================


const googleTTS = require('@google-cloud/text-to-speech');
const stream = require('stream');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const json5 = require('json5');
const path = require('path');


// =============================================================================


/* This will initialize the TTS system and add a new item to the api to include
 * a function that can speak text, as well as something that controls what the
 * language, gender and voice used will be as well.
 *
 * In order to get speech synthesis in the stream, we have an overlay that runs
 * in OBS that does the talking, and the back end gives it the information it
 * needs in order to synthesize text into speech on the fly.
 *
 * The current mechanism for this relies on this server side component to talk
 * to Google and fetch the audio, which is then proxied up to the overlay to
 * be played back over the stream.
 *
 * As such, the speech function returned from here will set up an appropriate
 * request for the back end TTS server, assign it a UUID, and then send a
 * message to the overlay telling it to play that UUID.
 *
 * The overlay responds by hitting our server for that UUID, which will proxy
 * the results back into the overlay to be played.
  *    - api.tts.speak */
function setup_tts(api) {
  // The TTS system adds a new item to the overall API that carries the default
  // configured speech parameters.
  api.tts = {
    language: api.config.get('tts.language') ?? 'en-US',
    gender: api.config.get('tts.gender') ?? 'MALE',
    voice: api.config.get('tts.voice') ?? 'en-US-Standard-J',
  }

  // Google's library looks for its configuration information by looking for a
  // file in the location given by this environment variable. If it's not set,
  // then there's nothing that we can do.
  //
  // In such a case we can leave because the above setup is all we need.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined) {
    api.log.warn('Google TTS support is turned off; configure tts and set GOOGLE_APPLICATION_CREDENTIALS to enable');

    // Since there is no TTS support, set up a stub that will take the same
    // arguments but not do anything with them; that way none of the other code
    // needs to know or care if the system is working.
    api.tts.speak =  (text, ttsConfig) => {
      api.log.info(`TTS(Stub): ${text}`);
    }
    return;
  }

  api.log.info(`Google TTS Support enabled; ${api.tts.language} - ${api.tts.gender} - ${api.tts.voice}`);

  // Set up our client for talking to Google's TTS system.
  const ttsClient = new googleTTS.TextToSpeechClient();

  // Whenever a request is received to speak some text, the appropriate request
  // for it is stored in the map, using a key that is a unique UUID that
  // represents that particular job and it's parameters. T==
  const speechJob = new Map();

  // Set up a function that will kick off speaking a particular piece of text
  // with a particular configuration. This works by queuing up a job that
  // carries with it the parameters of what to speak and how, and then asking
  // the overlay to speak it.
  //
  // Sequential requests are queued up in the overlay and will play in order.
  //
  // The configuration argument is used to specify how the synthesis should sound,
  // but if not present the values will be taken from the default config above.
  //
  // The default config is taken from the config system, but can be modified on
  // the fly by code in the bot by changing the values in api.tts.
  api.tts.speak = (text, ttsConfig) => {
    // Set up the job configuration, which will start with the defaults but can
    // be overridden by the passed in object.
    ttsConfig = {
      language: api.tts.language,
      voice: api.tts.voice,
      gender: api.tts.gender,

      ...(ttsConfig || {})
    };

    // Log the queuing of the job.
    api.log.info(`TTS: ${ttsConfig.language} - ${ttsConfig.gender} - ${ttsConfig.voice} - ${text}`);

    const id = uuidv4();
    speechJob.set(id, {
      input: { text },

      // https://cloud.google.com/text-to-speech/docs/voices
      voice: {
        languageCode: ttsConfig.language,
        name: ttsConfig.voice,
        ssmlGender: ttsConfig.gender
      },

      // select the type of audio encoding
      audioConfig: { audioEncoding: 'OGG_OPUS' }
    });

    // Ask the overlay to speak this particular text; when it receives the
    // message, it will make a request back to get things going.
    api.nodecg.sendMessage('stream-tts', id);
  };

  // Respond to a request to speak text from the dashboard or an overlay by
  // triggering the appropriate back end method.
  api.nodecg.listenFor('trigger-tts', info => {
    api.log.info(info);
    api.tts.speak(info.text, {
      language: info.language,
      gender: info.gender,
      voice: info.voice
    });
  });

  // Create a router for our TTS options.
  const tts = api.nodecg.Router();

  // Set up a route that will allow the front end to capture a list of all of
  // the available text to speech voices. This currently comes from a hard coded
  // file, although  it's possible to also fetch this directly from Google's TTS
  // API as well, although in that case the format of the data is vastly
  // different.
  tts.get('/tts/voices', (req, res, next) => {
    try {
      api.log.info(`GET /tts/voices`);
      const data = fs.readFileSync(path.resolve(api.baseDir, 'google_tts_voices.json'));

      res.json(json5.parse(data))
    } catch (error) {
      next(error);
    }
  });

  // Set up a route that will proxy a request for a specific job ID to google,
  // sending the resulting audio back to whoever made the request. The URL needs
  // to contain an ID value that is the UUID of the job, allowing us to know
  // what the request to google should look like.
  tts.get('/tts/job/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      api.log.info(`GET /tts/${id}`);

      const ttsReq = speechJob.get(id);
      speechJob.delete(id);

      if (ttsReq === undefined) {
        throw new Error(`No pending TTS job for ${id}`);
      }

      // Dispatch the request to Google to get the TTS response, then ship the
      // audio back.
      const [ttsRes] = await ttsClient.synthesizeSpeech(ttsReq);
      api.log.debug('Google TTS response received');

      // Create a pass through stream and pipe the content back through it with
      // an appropriate mime type.
      res.set('Content-Type', 'audio/ogg');
      new stream.PassThrough().end(ttsRes.audioContent).pipe(res);
    } catch (error) {
      next(error);
    }
  });

  // Mount the route, which gets the server to listen for us.
  api.nodecg.mount(tts);
}

module.exports = setup_tts;
