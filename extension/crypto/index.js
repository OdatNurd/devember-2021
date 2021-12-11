'use strict';

// =============================================================================

const crypto = require('crypto');

// =============================================================================

/* We use some encryption for some of the data stored in the database in an
 * attempt to make it less casually observable and leakable.
 *
 * This SHOULD NOT be considered unbreakable or a high security standard; this
 * bot is intended to run on your local computer, and so it's assumed that there
 * is enough safety there, and the encryption just needs to stop you from doing
 * something silly on stream.
 *
 * This will set up the crypto code in the passed in api struct when this is
 * called. */
function setup_crypto(api) {
    // There is a secret value used during our encryption/decryption, which is
    // where the safety in the system comes from. This is one of the config
    // fields that absolutely must exist. DO NOT SHARE THIS VALUE WITH ANYONE!
    const secret = api.config.get('crypto.secret');

    // The algorithm that's used for our encryption and decryption code; this
    // could be easily changed, but note that anyone logged in would have their
    // login state in limbo.
    const algorithm = 'aes-256-ctr';

    // Amend the api to include crypto routines for encrypting and decrypting
    // data as it goes to and from the database.
    api.crypto = {
        /* Given a piece of text, encrypt it. This will return an encrupted
         * version of the string suitable for passing to the decryptor.
         *
         * The encruption is done with a random vector of data that needs to
         * be present to decrypt, which requires the output to be an object.
         *
         * For ease of eyeball-looking-at and storage purposes, this converts
         * the object into a string and encodes it as base64 to make it appear
         * to be a single string. */
        encrypt: (text) => {
            // Create a new initialization vector for each encryption for extra
            // security; this makes the key harder to guess, but is required
            // in order to decrypt the data.
            const iv = crypto.randomBytes(16);

            // Do the encryption on the data, leaving it in an encrypted buffer.
            const cipher = crypto.createCipheriv(algorithm, secret, iv);
            const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

            // The returned value needs to contain the initialization vector used
            // during the operation as well as the data, so bundle it into an
            // object.
            //
            // We then convert that into a string and encode it so that it's a
            // single easily copy/pasteable string that's easier on the eyes and
            // easier to store in the database.
            return Buffer.from(JSON.stringify({
                iv: iv.toString('hex'),
                content: encrypted.toString('hex')
            })).toString('base64');
        },

        /* Given a piece of encrypted text that was returned from the encrypt
         * function and decrypty it.
         *
         * The encrypt function takes a string and returns a base64 encoded
         * version of an objet that describes how we would decrepty.
         *
         * This function takes the output of that function and decrupts it,
         * returning it back directly. */
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

            return Buffer.concat([decipher.update(content), decipher.final()]).toString();
        }
    }
}

// =============================================================================

module.exports = setup_crypto;