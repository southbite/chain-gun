const EventEmitter = require('events').EventEmitter;
const express = require('express');
const Gun = require('gun');
const path = require('path');
const utils = require('./util').create();

require('gun/lib/path.js');
require('gun/lib/unset.js');
require('gun/lib/then.js');
require('gun/lib/open.js');

require('gun-level');
const levelup = require('levelup');
const encode = require('encoding-down');
const leveldown = require('leveldown');

module.exports = class Db extends EventEmitter {

  constructor(opts) {

    super();

    this.defaults(opts);
  }

  static create(opts) {
    return new Db(opts);
  }

  async stop() {
    return new Promise((resolve, reject)=>{
      if (this.persistenceLayer) this.persistenceLayer.close((err)=>{
        if (err) return reject(err);
        this.emit('db/stopped', this.opts);
        resolve();
      });
    });
  }

  start() {

    this.persistenceLayer = levelup(
      encode(
        leveldown(this.opts.file),
        { valueEncoding: 'json' }
      )
    );
    this.data = new Gun({level: this.persistenceLayer, radisk:false, localStorage:false});
    this.emit('db/started', this.opts);
  }

  defaults(opts) {

    if (!opts) opts = {};
    if (!opts.file) opts.file = [__dirname, 'data', 'db'].join(path.sep);
    this.opts = opts;
  }
};
