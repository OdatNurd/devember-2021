'use strict';

// TODO would-be-nice tasks
//   - Wrap the logger so that anything that uses it will send their output to
//     a log panel in the IO
module.exports = function (nodecg) {
	nodecg.log.info('Hello, from your bundle\'s extension!');
	nodecg.log.info('I\'m where you put all your server-side code.');
	nodecg.log.info(`To edit me, open "${__filename}" in your favorite text editor or IDE.`);
	nodecg.log.info('You can use any libraries, frameworks, and tools you want. There are no limits.');
	nodecg.log.info('Visit https://nodecg.com for full documentation.');
	nodecg.log.info('Good luck!');
};
