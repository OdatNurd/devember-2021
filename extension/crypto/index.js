const crypto = require('crypto');

const algorithm = 'aes-256-ctr';

/* This will set up routines in the API that allow you to encrypt and decrupt
 * a piece of text seamlessly.
 *
 * This is not meant to be any sort of bulletproof encryption, but more a way
 * to ensure that some of the more obvious dumb things you could do are
 * protected. */
function setup_crypto(api) {
    const secret = api.config.get('crypto.secret');

    api.crypto = {
        /* Given a piece of text, encrypt it. This will return an encrupted
         * version of the string suitable for passing to the decryptor.
         *
         * The encruption is done with a random vector of data that needs to
         * be present to decrypt, which requires the output to be an object.
         *
         * For ease of eyeball-looking-at purposes, this converts the object
         * into a string and encodes it as base64 to make it appear to be a
         * single string. */
        encrypt: (text) => {
            // Create a new initialization vector for each encryption for extra
            // security; this makes the key harder to guess.
            const iv = crypto.randomBytes(16);

            // Do the encryption on the data, leaving it in an encrypted buffer.
            const cipher = crypto.createCipheriv(algorithm, secret, iv);
            const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

            // The returned value needs to contain the initialization vector used
            // during the operation as well as the data, so bundle it into an
            // object.
            //
            // We then convert that into a string and encode it so that it's a
            // single easily copy/pasteable string that's easier on the eyes.
            return Buffer.from(JSON.stringify({
                iv: iv.toString('hex'),
                content: encrypted.toString('hex')
            })).toString('base64');
        },

        /* Given a piece of encrypted text that was returned from the encrypt
         * function, decode the base64 back into a regular string, turn the
         * string into asn object, and then decrypt it to return the original
         * string.  */
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

module.exports = setup_crypto;