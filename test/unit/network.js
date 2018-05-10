var path = require('path');
var filename = path.basename(__filename);
var expect = require('expect.js');


describe('unit/' + filename, function () {

  it('initializes the network with empty opts, checks defaults', function (done) {

    var network = require('../../lib/network').create();

    expect(network.opts.name).to.not.be(null);
    expect(network.opts.name).to.not.be(undefined);
    expect(network.opts.file.indexOf(path.sep + network.opts.name + '_data.json') > -1).to.be(true);
    expect(network.opts.ip).to.be('127.0.0.1');
    expect(network.opts.url).to.be(['http://', network.opts.ip, ':', network.opts.port, '/gun'].join(''));

    done();
  });

  it('initializes the network with custom opts, ensures they are all correct', function (done) {

    var network = require('../../lib/network').create({
      name: 'test_name',
      port: 8090,
      ip: '127.0.0.5',
      peers: [{url: 'http://127.0.0.6:9090'}],
      file: 'test/file.json'
    });

    expect(network.opts.name).to.be('test_name');
    expect(network.opts.file).to.be('test/file.json');
    expect(network.opts.ip).to.be('127.0.0.5');
    expect(network.opts.port).to.be(8090);
    expect(network.opts.url).to.be(['http://', network.opts.ip, ':', network.opts.port, '/gun'].join(''));

    expect(network.opts.peers).to.eql([{url: 'http://127.0.0.6:9090'}]);

    done();

  });

  it('initializes the network with empty opts, starts the network, tests adding and listing data on the networks local db', function (done) {

    var network = require('../../lib/network').create();

    network.on('network/started', (opts) => {

      var testGetRecord = network.db.get('test-get');

      testGetRecord.on((data)=> {

        expect(data.id).to.be('test-get');

        testGetRecord.once((item) => {

          expect(item.id).to.be('test-get');

          var testArray = network.db.get('test-array');

          testArray.set({id: 'test-set-1'});
          testArray.set({id: 'test-set-2'});
          testArray.set({id: 'test-set-3'});

          //iterate through array
          testArray.map().once((item) => {
            expect(['test-set-1', 'test-set-2', 'test-set-3'].indexOf(item.id) > -1).to.be(true);
          });

          network.on('network/stopped', function () {
            done();
          });

          network.stop();
        })
      });

      testGetRecord.put({id: 'test-get'});

    });

    network.start();
  });

  it('initializes a master network and a peer network, tests adding data on the master network and verifying data on the peer network', function (done) {

    this.timeout(5000);

    var master = require('../../lib/network').create({port: 9090});

    master.on('network/started', () => {

      var peer = require('../../lib/network').create({port: 9091});

      peer.on('network/started', () => {

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
              testPeerArray.map().once((item) => {
                expect(['test-set-1', 'test-set-2', 'test-set-3'].indexOf(item.id) > -1).to.be(true);
              });

              master.on('network/stopped', function () {

                peer.on('network/stopped', function () {
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

  it('initializes a master network and a peer network, tests adding data on the peer network and verifying data on the master network, ensuring bi-directionality', function (done) {

    this.timeout(5000);

    var master = require('../../lib/network').create({port: 9090});

    master.on('network/started', () => {

      var peer = require('../../lib/network').create({port: 9091});

      peer.on('network/started', () => {

        master.on('network/peer/added', (peerUrl) => {

          expect(peerUrl).to.be('http://127.0.0.1:9091/gun');

          var testMasterGetRecord = master.db.get('test-get');
          var testPeerGetRecord = peer.db.get('test-get');

          testMasterGetRecord.on((data)=> {

            expect(data.id).to.be('test-get');

            testMasterGetRecord.once((item) => {

              expect(item.id).to.be('test-get');

              var testMasterArray = master.db.get('test-array');
              var testPeerArray = peer.db.get('test-array');

              testPeerArray.set({id: 'test-set-1'});
              testPeerArray.set({id: 'test-set-2'});
              testPeerArray.set({id: 'test-set-3'});

              //iterate through array
              testMasterArray.map().once((item) => {
                expect(['test-set-1', 'test-set-2', 'test-set-3'].indexOf(item.id) > -1).to.be(true);
              });

              master.on('network/stopped', function () {

                peer.on('network/stopped', function () {
                  done();
                });

                peer.stop();
              });

              master.stop();
            })
          });

          testPeerGetRecord.put({id: 'test-get'});

        });

        master.addPeer('http://127.0.0.1:9091/gun');
      });

      peer.start();
    });

    master.start();

  });

  it('initializes a master network and 2 peer network instances, 1 peer is pointed to another peer, tests adding data on the master network and verifying data on the 2nd peer network, ensuring the network is consistent when peers are separated by configuration', function (done) {

    this.timeout(10000);

    var master = require('../../lib/network').create({port: 9090});

    master.on('network/started', () => {

      var peer = require('../../lib/network').create({port: 9091});

      peer.on('network/started', () => {

        var peer1 = require('../../lib/network').create({port: 9092});

        peer1.on('network/started', () => {

          master.on('network/peer/added', (peerUrl) => {

            expect(peerUrl).to.be('http://127.0.0.1:9091/gun');

            var testMasterGetRecord = master.db.get('test-get');
            var testPeerGetRecord = peer1.db.get('test-get');

            testPeerGetRecord.on((data)=> {

              expect(data.id).to.be('test-get');

              testPeerGetRecord.once((item) => {

                expect(item.id).to.be('test-get');

                var testMasterArray = master.db.get('test-array');
                var testPeerArray = peer1.db.get('test-array');

                testMasterArray.set({id: 'test-set-1'});
                testMasterArray.set({id: 'test-set-2'});
                testMasterArray.set({id: 'test-set-3'});

                var found = [];

                //iterate through array
                testPeerArray.map().once((item) => {
                  found.push(item.id);
                });

                setTimeout(() => {

                  expect(found.sort()).to.eql(['test-set-1', 'test-set-2', 'test-set-3']);

                  expect(Object.keys(peer.peers).sort()).to.eql(['http://127.0.0.1:9090/gun', 'http://127.0.0.1:9091/gun', 'http://127.0.0.1:9092/gun']);
                  expect(Object.keys(master.peers).sort()).to.eql(['http://127.0.0.1:9090/gun', 'http://127.0.0.1:9091/gun', 'http://127.0.0.1:9092/gun']);
                  expect(Object.keys(peer1.peers).sort()).to.eql(['http://127.0.0.1:9090/gun', 'http://127.0.0.1:9091/gun', 'http://127.0.0.1:9092/gun']);

                  master.on('network/stopped', function () {

                    peer.on('network/stopped', function () {

                      peer1.on('network/stopped', function () {
                        done();
                      });

                      peer1.stop();
                    });

                    peer.stop();
                  });

                  master.stop();

                }, 2000);
              })
            });

            testMasterGetRecord.put({id: 'test-get'});
          });

          peer1.addPeer('http://127.0.0.1:9091/gun');
          master.addPeer('http://127.0.0.1:9091/gun');
        });

        peer1.start();
      });

      peer.start();
    });

    master.start();
  });

  it('initializes a master network and 2 peer network instances, 1 peer is pointed to another peer, tests the networkEmit functionality', function (done) {

    this.timeout(10000);

    var eventsLog = {
      'test/network/master/emit': [],
      'test/network/peer/emit': [],
      'test/network/peer1/emit': []
    };

    var master = require('../../lib/network').create({port: 9090});

    master.on('network/started', () => {

      var peer = require('../../lib/network').create({port: 9091});

      peer.on('network/started', () => {

        var peer1 = require('../../lib/network').create({port: 9092});

        peer1.on('network/started', () => {

          peer.on('test/network/master/emit', function (data) {
            eventsLog['test/network/master/emit'].push(data);
          });

          peer1.on('test/network/master/emit', function (data) {
            eventsLog['test/network/master/emit'].push(data);
          });

          peer.on('test/network/peer1/emit', function (data) {
            eventsLog['test/network/peer1/emit'].push(data);
          });

          peer1.on('test/network/peer/emit', function (data) {
            eventsLog['test/network/peer/emit'].push(data);
          });

          master.on('test/network/peer1/emit', function (data) {
            eventsLog['test/network/peer1/emit'].push(data);
          });

          master.on('test/network/peer/emit', function (data) {
            eventsLog['test/network/peer/emit'].push(data);
          });

          setTimeout(() => {

            peer.networkEmit('test/network/peer/emit', {peer: 'peer'});
            peer1.networkEmit('test/network/peer1/emit', {peer: 'peer1'});
            master.networkEmit('test/network/master/emit', {peer: 'master'});

            setTimeout(() => {

              expect(eventsLog['test/network/peer/emit'].length).to.be(2);
              expect(eventsLog['test/network/peer1/emit'].length).to.be(2);
              expect(eventsLog['test/network/master/emit'].length).to.be(2);

              expect(eventsLog['test/network/peer/emit'][0]).to.eql({peer: 'peer'});
              expect(eventsLog['test/network/peer1/emit'][0]).to.eql({peer: 'peer1'});
              expect(eventsLog['test/network/master/emit'][0]).to.eql({peer: 'master'});

              master.on('network/stopped', function () {

                peer.on('network/stopped', function () {

                  peer1.on('network/stopped', function () {
                    done();
                  });

                  peer1.stop();
                });

                peer.stop();
              });

              master.stop();

            }, 3000);

          }, 3000);


          peer1.addPeer('http://127.0.0.1:9091/gun');
          master.addPeer('http://127.0.0.1:9091/gun');
        });

        peer1.start();
      });

      peer.start();
    });

    master.start();
  });
});
