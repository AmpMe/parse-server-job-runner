const SpecReporter = require('jasmine-spec-reporter').SpecReporter;
jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.TEST_TIMEOUT || 30000;
jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(new SpecReporter());

process.on('unhandledRejection', function(err, promise) {
  console.error('Unhandled rejection (promise: ', promise, ', reason: ', err, ').');
  console.error(err.stack);
});

const startDB = require('mongodb-runner/mocha/before').bind({
  timeout: () => {},
  slow: () => {}
});
const stopDB = require('mongodb-runner/mocha/after');

beforeAll(startDB);
afterAll(stopDB);
