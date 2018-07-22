var path = require('path');
var filename = path.basename(__filename);
var expect = require('expect.js');

describe('unit/' + filename, function() {

  it('initializes the membership service with hosts only opts, checks defaults', function(done) {

    var membership = require('../../lib/membership').create({
      hosts: ['127.0.0.1:8182']
    });

    expect(membership.opts).to.eql({
      hosts: ['127.0.0.1:8182'],
      local: {
        host: '127.0.0.1:8181',
        meta: undefined
      },
      codec: 'msgpack',
      disseminationFactor: 15,
      interval: 100,
      joinTimeout: 20000,
      pingTimeout: 20,
      pingReqTimeout: 60,
      pingReqGroupSize: 3,
      suspectTimeout: 60,
      udp: {
        maxDgramSize: 512
      },
      preferCurrentMeta: true
    });

    done();
  });

  it('starts up multiple members, tests they are able to gossip about each other', function(done) {

    this.timeout(10000);

    var membership1 = require('../../lib/membership').create({
      host:'127.0.0.1:8180',
      hosts: ['127.0.0.1:8181']
    });

    var membership2 = require('../../lib/membership').create({
      host:'127.0.0.1:8181',
      hosts: ['127.0.0.1:8182']
    });

    var membership3 = require('../../lib/membership').create({
      host:'127.0.0.1:8182',
      hosts: ['127.0.0.1:8180']
    });

    membership1.start();
    membership2.start();
    membership3.start();

    setTimeout(function(){
      expect(membership1.activeMembers().map(function(member){
        return member.host;
      }).sort()).to.eql(['127.0.0.1:8181', '127.0.0.1:8182']);

      expect(membership2.activeMembers().map(function(member){
        return member.host;
      }).sort()).to.eql(['127.0.0.1:8180', '127.0.0.1:8182']);

      expect(membership3.activeMembers().map(function(member){
        return member.host;
      }).sort()).to.eql(['127.0.0.1:8180', '127.0.0.1:8181']);

      membership1.stop();
      membership2.stop();
      membership3.stop();

      done();
    }, 5000);

  });
});
