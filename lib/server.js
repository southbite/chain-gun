const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const utils = require('./util').create();
const express = require('express');
const Gun = require('gun');
const path = require('path');
const sillyName = require('sillyname');
const Network = require('./network');
const Blockchain = require('./blockchain');

require('gun/lib/path.js');
require('gun/lib/unset.js');
require('gun/lib/then.js');

module.exports = class Server extends EventEmitter {

  constructor(opts) {

    super();

    this.defaults(opts);

    this.network = Network.create(this.opts);
    this.blockchain = Blockchain.create(this.opts);

    this.blockchain.on('block-mined', this.blockMinedHandler.bind(this))
  }

  static create(opts) {
    return new Server(opts);
  }

  stop() {

    this.network.on('network/stopped', ()=> {
      this.blockchain.mineStop();
      this.emit('server/stopped', this.opts);
    });

    this.network.stop();
  }

  start() {

    this.network.on('network/started', ()=> {
      this.blockchain.mineStart();
      this.emit('server/started', this.opts);
    });

    this.network.start();
  }

  blockMinedHandler(candidate){

    this.network.networkEmit('block-mined', candidate);
  }

  defaults(opts) {

    if (!opts) opts = {};

    if (!opts.name) opts.name = sillyName();
    if (!opts.file) opts.file = [__dirname, 'data', opts.name + '_data.json'].join(path.sep);

    this.opts = opts;
  }
};

