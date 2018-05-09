var path = require('path');
var filename = path.basename(__filename);
var expect = require('expect.js');


describe('unit/' + filename, function () {

  it('initializes the server with empty opts, checks defaults', function (done) {

    var server = require('../../lib/server').create();

    expect(server.opts.name).to.not.be(null);
    expect(server.opts.name).to.not.be(undefined);
    expect(server.opts.file.indexOf(path.sep + server.opts.name + '_data.json') > -1).to.be(true);
    expect(server.opts.ip).to.be('127.0.0.1');
    expect(server.opts.url).to.be(['http://', server.opts.ip, ':', server.opts.port, '/gun'].join(''));

    done();
  });

  it('initializes the server with custom opts, ensures they are all correct', function (done) {

    var server = require('../../lib/server').create({
      name: 'test_name',
      port: 8090,
      ip: '127.0.0.5',
      peers: [{url: 'http://127.0.0.6:9090'}],
      file: 'test/file.json'
    });

    expect(server.opts.name).to.be('test_name');
    expect(server.opts.file).to.be('test/file.json');
    expect(server.opts.ip).to.be('127.0.0.5');
    expect(server.opts.port).to.be(8090);
    expect(server.opts.url).to.be(['http://', server.opts.ip, ':', server.opts.port, '/gun'].join(''));

    expect(server.opts.peers).to.eql([{url: 'http://127.0.0.6:9090'}]);

    done();

  });

  it('initializes the server with empty opts, starts the server, tests adding and listing data on the servers local db', function (done) {

    var server = require('../../lib/server').create();

    server.on('server/started', () => {

      var testGetRecord = server.db.get('test-get');

      testGetRecord.on((data)=> {

        expect(data.id).to.be('test-get');

        testGetRecord.once((item) => {

          expect(item.id).to.be('test-get');

          var testArray = server.db.get('test-array');

          testArray.set({id: 'test-set-1'});
          testArray.set({id: 'test-set-2'});
          testArray.set({id: 'test-set-3'});

          //iterate through array
          testArray.map((item) => {
            expect(['test-set-1', 'test-set-2', 'test-set-3'].indexOf(item.id) > -1).to.be(true);
          });

          server.on('server/stopped', function () {
            done();
          });

          server.stop();
        })
      });

      testGetRecord.put({id: 'test-get'});

    });

    server.start();
  });

  it('initializes a master server and a peer server, tests adding data on the master server and verifying data on the peer server', function (done) {

    this.timeout(5000);

    var master = require('../../lib/server').create({port: 9090});

    master.on('server/started', () => {

      var peer = require('../../lib/server').create({port: 9091});

      peer.on('server/started', () => {

        master.on('network/peer/added', (peerUrl) => {

          expect(peerUrl).to.be('http://127.0.0.1:9091/gun');

          var testMasterGetRecord = master.db.get('test-get');
          var testPeerGetRecord = peer.db.get('test-get');

          testPeerGetRecord.on((data)=> {

            expect(data.id).to.be('test-get');

            testPeerGetRecord.once((item) => {

              expect(item.id).to.be('test-get');

              var testMasterArray = master.db.get('test-array');
              var testPeerArray = peer.db.get('test-array');

              testMasterArray.set({id: 'test-set-1'});
              testMasterArray.set({id: 'test-set-2'});
              testMasterArray.set({id: 'test-set-3'});

              //iterate through array
              testPeerArray.map((item) => {
                expect(['test-set-1', 'test-set-2', 'test-set-3'].indexOf(item.id) > -1).to.be(true);
              });

              master.on('server/stopped', function () {

                peer.on('server/stopped', function () {
                  done();
                });

                peer.stop();
              });

              master.stop();
            })
          });

          testMasterGetRecord.put({id: 'test-get'});

        });

        master.addPeer('http://127.0.0.1:9091/gun');
      });

      peer.start();
    });

    master.start();

  });
});
