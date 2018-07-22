var path = require('path');
var filename = path.basename(__filename);
var expect = require('expect.js');

const Network = require('../../lib/network');
const Blockchain = require('../../lib/blockchain');
const Membership = require('../../lib/membership');
const Db = require('../../lib//db');
const Util = require('../../lib/util');
const fs = require('fs-extra');

var dataDir = path.resolve([__dirname,'..','__fixtures', 'data'].join('/'));

describe('unit/' + filename, function() {

  before('it sets up data directories', function(){
    fs.ensureDirSync(dataDir);
  });

  function createServer(opts){

    return require('../../lib/server').create(opts.server,
      Network.create(opts.network),
      Blockchain.create(opts.blockchain),
      Membership.create(opts.membership),
      Db.create(opts.db),
      Util.create()
    );
  }

  it('initializes the server', function(done) {

    var opts = {
      network:{

      },
      blockchain:{

      },
      membership:{
        host:'127.0.0.1:8181',
        hosts:['127.0.0.1:8180']
      },
      db:{

      }
    };

    createServer(opts);

    done();
  });

  it('initializes, starts and the stops 2 servers', function(done) {

    var opts1 = {
      network:{
        port:8080
      },
      membership:{
        host:'127.0.0.1:8181',
        hosts:['127.0.0.1:8180']
      },
      db:{
        file:dataDir + '/1.db'
      }
    };

    var opts2 = {
      network:{
        port:8081
      },
      membership:{
        host:'127.0.0.1:8180',
        hosts:['127.0.0.1:8181']
      },
      db:{
        file:dataDir + '/2.db'
      }
    };

    var server1 = createServer(opts1);
    var server2 = createServer(opts2);

    var server1stopped = false;
    var server2stopped = false;

    server1.once('server/started', function(){

      server2.once('server/stopped', function(){
        server2stopped = true;
        if (server1stopped) done();
      });

      server2.once('server/stopped', function(){
        server1stopped = true;
        if (server2stopped) done();
      });

      server1.stop();
      server2.stop();
    });

    server1.start();
    server2.start();
  });
});
