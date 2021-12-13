'use strict';


// =============================================================================


const crypto = require('crypto');


// =============================================================================


/* We use encryption for some of the data stored in the database in an attempt
 * to make it less casually observable and leakable while on stream.
 *
 * This *SHOULD NOT* be considered unbreakable or a high security standard; this
 * bot is intended to run on your local computer, and so it's assumed that there
 * is enough safety there, and the encryption just needs to stop you from doing
 * something silly on stream.
 *
 * This includes elements in the API structure that is passed in to include the
 * crypto endpoints that we need:
 *    - api.crypto.encrypt
 *    - api.crypto.decrypt */
function setup_crypto(api) {
    // There is a secret value used during our encryption/decryption, which is
    // where the safety in the system comes from. This is one of the config
    // fields that absolutely must exist. DO NOT SHARE THIS VALUE WITH ANYONE!
    const secret = api.config.get('crypto.secret');

    // The algorithm that's used for our encryption and decryption code; this
    // could be easily changed, but note that the authorized accounts would
    // have their login state in limbo; if you want to change this, purge the
    // token records from the database.
    const algorithm = 'aes-256-ctr';

    // Amend the api to include crypto routines for encrypting and decrypting
    // data as it goes to and from the database.
    api.crypto = {
        /* Given a piece of text, encrypt it. This will return an encrypted
         * version of the string suitable for passing to the decrypt endpoint.
         *
         * The encryption is done with a random vector of data that needs to
         * be present to decrypt, which requires the output to be an object.
         *
         * For ease of eyeball-looking-at and storage purposes, this converts
         * the object into a string and encodes it as base64 before returning it
         * to make it appear to be a single string. */
        encrypt: (text) => {
            // Create a new initialization vector for each encryption for extra
            // security; this makes the key harder to guess, but is required
            // in order to decrypt the data.
            const iv = crypto.randomBytes(16);

            // Do the encryption on the data, leaving it in an encrypted buffer.
            const cipher = crypto.createCipheriv(algorithm, secret, iv);
            const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

            // The returned value needs to contain the initialization vector
            // used during the operation as well as the data, so bundle it into
            // an object.

            // We then convert that into a string and encode it as base64 so
            // that it's a single string that's easier on the eyes and easier to
            // store in the database.
            return Buffer.from(JSON.stringify({
                iv: iv.toString('hex'),
                content: encrypted.toString('hex')
            })).toString('base64');
        },

        /* Given a piece of encrypted text that was returned from the encrypt
         * function. decrypt it and return the original string.
         *
         * This will base64 decode the data back into an object, then use the
         * object to power the decrypt function, allowing us to get at the
         * original string for return. */
        decrypt: (text) => {
            // Decode the incoming text back into base64, and then decode it
            // back into an object that contains the encrypted data and the
            // vector used to create it.
            const hash = JSON.parse(Buffer.from(text, 'base64').toString('utf-8'));
            const iv = Buffer.from(hash.iv, 'hex');

            // Create the object that will do the decrypt using the data from
            // the hash
            const decipher = crypto.createDecipheriv(algorithm, secret, iv);
            const content = Buffer.from(hash.content, 'hex');

            // Return the decrypted data.
            return Buffer.concat([decipher.update(content), decipher.final()]).toString();
        }
    }
}


// =============================================================================


module.exports = setup_crypto;