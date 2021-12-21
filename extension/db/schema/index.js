'use strict';


// =============================================================================


const { TokenSchema } = require('./tokens');
const { UserSchema } = require('./users');
const { CommandSchema } = require('./commands');
const { RegularUserSchema } = require('./regulars');
const { ResponseSchema } = require('./responses');


// =============================================================================


module.exports = {
  TokenSchema,
  UserSchema,
  CommandSchema,
  RegularUserSchema,
  ResponseSchema
};
