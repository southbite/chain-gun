const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const express = require('express');
const Gun = require('gun');
const path = require('path');
const sillyName = require('sillyname');
const utils = require('./util').create();

require('gun/lib/path.js');
require('gun/lib/unset.js');
require('gun/lib/then.js');
require('gun/lib/open.js');

require('gun-level');
const levelup = require('levelup');
const encode = require('encoding-down');
const leveldown = require('leveldown');

module.exports = class Network extends EventEmitter {

  constructor(opts) {

    super();

    this.peers = {};

    this.defaults(opts);
  }

  static create(opts) {
    return new Network(opts);
  }

  stop() {

    this.stopPeersListUpdate();

    if (this.httpServer) this.httpServer.close();

    this.emit('network/stopped', this.opts);
  }

  start() {

    this.middleware = express();

    this.middleware.use(Gun.serve);
    this.middleware.use('/ui', express.static(__dirname + path.sep + 'www'));

    this.httpServer = require('http').createServer(this.middleware);
    this.httpServer.listen(this.opts.port);

    const levelDB = levelup(
      encode(
        leveldown(this.opts.file),
        { valueEncoding: 'json' }
      )
    );

    this.db = new Gun({level: levelDB, radisk:false, localStorage:false, web: this.httpServer});

    if (this.opts.peers && this.opts.peers.length > 0)
      this.opts.peers.forEach((peerUrl) => {
        this.addPeer(peerUrl);
      });

    this.peersUpdateInterval = this.startPeersListUpdate();

    this.attachToNetworkMessages();

    this.emit('network/started', this.opts);
  }

  updatePeerList(peerInfo) {

    if (!peerInfo || this.peers[peerInfo.url] != null) return;

    this.db.get('network/peer/' + peerInfo.url).get('opts').once((opts)=> {
      this.peers[peerInfo.url] = opts;
    });
  }

  startPeersListUpdate() {

    this.peerReference = this.db.get('network/peer/' + this.opts.url).put({url: this.opts.url, opts: this.opts});

    this.db.get('network/peer/list').set(this.peerReference);

    return setInterval(()=> {
      this.db.get('network/peer/list').map().once(this.updatePeerList.bind(this));
    }, 500);
  }

  stopPeersListUpdate() {

    if (this.peersUpdateInterval) clearInterval(this.peersUpdateInterval);

    if (this.peerReference) this.db.get('network/peer/list').unset(this.peerReference);
  }

  addPeer(peer) {

    if (!this.peers[peer]) this.db.opt({peers: [peer]});

    this.emit('network/peer/added', peer);
  }

  attachToNetworkMessages() {

    this.db.get('network-messages').map().path('id').on((messageId)=> {

      this.db.get('network/peer/' + messageId).open((message)=> {

        if (message.origin.url != this.opts.url) this.emit(message.eventKey, message.data);
      })
    });
  }

  //unprotected emit to the network
  networkEmit(eventKey, data) {

    var messageId = utils.id();

    var messageReference = this.db.get('network/peer/' + messageId).put({
      id: messageId,
      eventKey: eventKey,
      data: data,
      origin: {url: this.opts.url},
      timestamp: Date.now()
    });

    this.db.get('network-messages').set(messageReference);
  }

  //directed REST request across the network to a specific peer, will also allow for a nonce and signing for extra security
  networkRequest(peer, data) {

  }

  defaults(opts) {

    if (!opts) opts = {};
    if (!opts.port) opts.port = 8080;
    if (!opts.ip) opts.ip = '127.0.0.1';

    opts.url = ['http://', opts.ip, ':', opts.port, '/gun'].join('');

    if (!opts.name) opts.name = sillyName();
    if (!opts.file) opts.file = [__dirname, 'data', opts.name].join(path.sep);

    this.opts = opts;
  }
};

