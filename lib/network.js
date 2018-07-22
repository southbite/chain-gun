const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sillyName = require('sillyname');
const utils = require('./util').create();
const request = require('restler');

module.exports = class Network extends EventEmitter {

  constructor(opts) {

    super();
    this.apiRequestHandlers = {};
    this.defaults(opts);
  }

  static create(opts) {
    return new Network(opts);
  }

  stop() {

    if (this.httpServer) this.httpServer.close();
    this.emit('network/stopped', this.opts);
  }

  start() {

    var app = express();
    app.use('/ui', express.static(__dirname + path.sep + 'www'));
    app.post('/api/*', bodyParser.json(), this.handleAPIRequest.bind(this));
    this.httpServer = app.listen(this.opts.port);
    this.emit('network/started', this.opts);
  }

  addApiRequestHandler(action, handler) {

    this.apiRequestHandlers[action] = handler;
  }

  handleAPIRequest(req, res) {

    var action = req.url.split('/api')[1];

    if (!this.apiRequestHandlers[action]) return res.status(404).send('missing action handler for action: ' + action);
    this.apiRequestHandlers[action](req, res);
  }

  //REST request to the entire network
  async broadcast(peerUrls, action, data) {

    const requests = peerUrls.map((peerUrl) => {
      return this.request(peerUrl, action, data);
    });
    return await Promise.all(requests);
  }

  //directed REST request across the network to a specific peer
  async request(peerUrl, action, data) {

    if (action[0] != '/') action = '/' + action;
    return new Promise(function(resolve, reject) {
      request.postJson(peerUrl + '/api' + action, data)
        .on('complete', function(result) {
          resolve(result);
        })
        .on('error', reject);
    });
  }

  defaults(opts) {

    if (!opts) opts = {};
    if (!opts.protocol) opts.protocol = 'http';
    if (!opts.port) opts.port = 8080;
    if (!opts.ip) opts.ip = '127.0.0.1';
    opts.url = [opts.protocol, '://', opts.ip, ':', opts.port].join('');
    if (!opts.name) opts.name = sillyName();
    this.opts = opts;
  }
};
