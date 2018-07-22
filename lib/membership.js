const EventEmitter = require('events').EventEmitter;
const utils = require('./util').create();
const Swim = require('swim');

module.exports = class Membership extends EventEmitter {

  constructor(opts) {

    super();

    this.peers = {};

    this.defaults(opts);
  }

  static create(opts) {
    return new Membership(opts);
  }

  stop() {
    if (this.swim) {
      this.swim.leave();
      this.swim.removeAllListeners();
    }
    this.emit('membership/stopped', this.opts);
  }

  async start() {

    return new Promise((resolve, reject)=>{

      var swim = new Swim(this.opts);

      console.log('bootstrapping membership, looking for hosts...');

      swim.bootstrap(this.getHosts(), (err) => {

          if (err) {
              // error handling
              this.emit('membership/error', err);
              return reject(err);
          }

          // ready
          // console.log(swim.whoami());
          // console.log(swim.members());
          // console.log(swim.checksum());

          swim.on(Swim.EventType.Change, this.onChange);
          swim.on(Swim.EventType.Update, this.onUpdate);

          this.swim = swim;
          resolve();
      });

      this.emit('membership/started', this.opts);
    });
  }

  activeMembers(){
    if (this.swim) return this.swim.members();
  }

  whoami(){
    if (this.swim) return this.swim.whoami();
  }

  checksum(){
    if (this.swim) return this.swim.checksum();
  }

  // update::: { meta: undefined,
  //   host: '127.0.0.1:8181',
  //   state: 1,
  //   incarnation: 0 }
  // change::: { meta: undefined,
  //   host: '127.0.0.1:8181',
  //   state: 2,
  //   incarnation: 0 }
  // update::: { meta: undefined,
  //   host: '127.0.0.1:8181',
  //   state: 2,
  //   incarnation: 0 }

  onChange(update) {
    this.emit('membership/change', update);
  }

  onUpdate(update) {
    this.emit('membership/update', update);
  }

  getHosts(){
    var hosts = this.getPersistedHosts();
    return hosts.concat(this.opts.hosts.filter(function(host){
      return hosts.indexOf(host) == -1;
    }));
  }

  persistHost(){

  }

  getPersistedHosts(){
    return [];
  }

  defaults(opts) {

    if (!opts) throw new Error('options cannot be null');
    if (!opts.hosts || opts.hosts.length == 0) throw new Error('options.hosts cannot be null or empty');

    this.opts = {
        hosts: opts.hosts,
        local: {
            host: opts.host || '127.0.0.1:8181',
            meta: opts.meta
        },
        codec: opts.codec || 'msgpack',
        disseminationFactor: opts.disseminationFactor || 15,
        interval: opts.interval || 100,
        joinTimeout: opts.joinTimeout || 20000,
        pingTimeout: opts.pingTimeout || 20,
        pingReqTimeout: opts.pingReqTimeout || 60,
        pingReqGroupSize: opts.pingReqGroupSize || 3,
        suspectTimeout: opts.suspectTimeout || 60,
        udp: {maxDgramSize: opts.maxDgramSize || 512},
        preferCurrentMeta: opts.preferCurrentMeta || true
    };
  }
};
