var path = require('path');
var filename = path.basename(__filename);
var expect = require('expect.js');

describe('unit/' + filename, function() {

  it('initializes the network with empty opts, checks defaults', function(done) {

    var network = require('../../lib/network').create();

    expect(network.opts.name).to.not.be(null);
    expect(network.opts.name).to.not.be(undefined);
    expect(network.opts.ip).to.be('127.0.0.1');
    expect(network.opts.url).to.be(['http://', network.opts.ip, ':', network.opts.port].join(''));

    done();
  });

  it('initializes the network with custom opts, ensures they are all correct', function(done) {

    var network = require('../../lib/network').create({
      name: 'test_name',
      port: 8090,
      ip: '127.0.0.5'
    });

    expect(network.opts.name).to.be('test_name');
    expect(network.opts.ip).to.be('127.0.0.5');
    expect(network.opts.port).to.be(8090);
    expect(network.opts.url).to.be(['http://', network.opts.ip, ':', network.opts.port].join(''));

    done();
  });

  it('initializes the network with empty opts, starts and stops the network', function(done) {

    var network = require('../../lib/network').create();

    network.on('network/started', (opts) => {
      network.on('network/stopped', function() {
        done();
      });
      network.stop();
    });

    network.start();
  });

  it('starts a network, checks we can access the ui html', function(done) {

    var network = require('../../lib/network').create();
    var request = require('request');

    network.on('network/started', (opts) => {
      network.on('network/stopped', function() {
        done();
      });
      request('http://127.0.0.1:8080/ui/logs.html', function(err, response, body) {
          expect(response.statusCode).to.be(200); // 200
          expect(body).to.be('<div>chain-gun logs</div>\n'); // 'image/png'
          network.stop();
        });
    });
    network.start();
  });

  it('starts 2 networks, checks we are able to request between them', function(done) {

    this.timeout(5000);

    var network1 = require('../../lib/network').create({port:8080});
    var network2 = require('../../lib/network').create({port:8081});

    network1.addApiRequestHandler('/block/at/index', function(req, res){
      res.status(200).send(req.body);
    });

    network2.addApiRequestHandler('/block/at/index', function(req, res){
      res.status(200).send(req.body);
    });

    network1.start();
    network2.start();

    setTimeout(function(){

      network1.request(network2.opts.url, '/block/at/index', {test:'data'})
      .then(function(response){
        expect(response).to.eql({test:'data'});
        return network2.request(network2.opts.url, '/block/at/index', {test:'data'});
      })
      .then(function(response){
        expect(response).to.eql({test:'data'});
        network1.stop();
        network2.stop();
        done();
      })

    }, 2000);
  });

  it('starts 3 networks, checks we are able to broadcast from 1 to the others', function(done) {

    this.timeout(5000);

    var network1 = require('../../lib/network').create({port:8080});
    var network2 = require('../../lib/network').create({port:8081});
    var network3 = require('../../lib/network').create({port:8082});

    network1.addApiRequestHandler('/block/at/index', function(req, res){
      res.status(200).send(req.body);
    });

    network2.addApiRequestHandler('/block/at/index', function(req, res){
      res.status(200).send(req.body);
    });

    network3.addApiRequestHandler('/block/at/index', function(req, res){
      res.status(200).send(req.body);
    });

    network1.start();
    network2.start();
    network3.start();

    setTimeout(function(){

      network1.broadcast([network2.opts.url, network3.opts.url], '/block/at/index', {test:'data'})
      .then(function(response){
        expect(response).to.eql([{test:'data'}, {test:'data'}]);
        network1.stop();
        network2.stop();
        network3.stop();
        done();
      })
    }, 2000);
  });
});
