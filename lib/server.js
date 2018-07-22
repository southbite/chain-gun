const EventEmitter = require('events').EventEmitter;
const path = require('path');
const sillyName = require('sillyname');

module.exports = class Server extends EventEmitter {

  constructor(opts, network, blockchain, membership, db, util) {

    super();

    this.defaults(opts);

    this.network = network;
    this.blockchain = blockchain;
    this.membership = membership;
    this.db = db;
    this.util = util;
  }

  static create(opts, network, blockchain, membership, db, util) {
    return new Server(opts, network, blockchain, membership, db, util);
  }

  attachListeners(){

    this.blockchain.on('block-mined', this.blockMinedHandler.bind(this));
  }

  detachListeners(){

    this.membership.removeAllListeners();
    this.blockchain.removeAllListeners();
    this.network.removeAllListeners();
    this.db.removeAllListeners();
  }

  async stop() {

    this.membership.stop();
    this.blockchain.mineStop();
    this.network.stop();
    await this.db.stop();
    this.emit('server/stopped', this.opts);
    this.detachListeners();
  }

  async start() {

    this.attachListeners();
    this.db.start();
    await this.membership.start();
    this.network.start();
    this.blockchain.mineStart();
    this.emit('server/started', this.opts);
  }

  blockMinedHandler(candidate){

    this.network.broadcast('block-mined', candidate);
  }

  defaults(opts) {

    if (!opts) opts = {};

    if (!opts.name) opts.name = sillyName();
    if (!opts.file) opts.file = [__dirname, 'data', opts.name + '_data.json'].join(path.sep);

    this.opts = opts;
  }
};
