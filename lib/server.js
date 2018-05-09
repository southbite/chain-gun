const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const utils = require('./util').create();
const express = require('express');
const Gun = require('gun');
const path = require('path');
const sillyName = require('sillyname');

require('gun/lib/path.js');
require('gun/lib/unset.js');

module.exports = class Server extends EventEmitter {

  constructor(opts) {

    super();

    this.peers = {};

    this.defaults(opts);
  }

  static create(opts) {
    return new Server(opts);
  }

  stop() {

    if (this.httpServer) this.httpServer.close();

    this.emit('server/stopped', this.opts);
  }

  start() {

    this.middleware = express();

    this.middleware.use(Gun.serve);
    this.middleware.use('/ui', express.static(__dirname + path.sep + 'www'));

    this.httpServer = require('http').createServer(this.middleware);
    this.httpServer.listen(this.opts.port);

    this.db = Gun({file: this.opts.file, web: this.httpServer});

    if (this.opts.peers && this.opts.peers.length > 0)
      this.opts.peers.forEach((peerUrl) => {
        this.addPeer(peerUrl);
      });

    this.emit('server/started', this.opts);
  }

  addPeer(peer) {

    if (!this.peers[peer]) this.db.opt({peers: [peer]});

    this.emit('network/peer/added', peer);
  }

  defaults(opts) {

    if (!opts) opts = {};
    if (!opts.port) opts.port = 8080;
    if (!opts.ip) opts.ip = '127.0.0.1';

    opts.url = ['http://', opts.ip, ':', opts.port, '/gun'].join('');

    if (!opts.name) opts.name = sillyName();
    if (!opts.file) opts.file = [__dirname, 'data', opts.name + '_data.json'].join(path.sep);

    this.opts = opts;
  }
};

