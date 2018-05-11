
var timestamp = process.argv[2];

console.log('timestamp: ', timestamp);

var master = require('../../lib/network').create({port: 9090, name: 'test-persistence-between-restarts-' + timestamp});

master.on('network/started', () => {

  master.db.get('test-get-' + timestamp).put({test:'data'});

  console.log('put value...');

  setTimeout(function(){
    console.log('exiting ok...');
    process.exit(0);
  }, 1000);

});

master.start();