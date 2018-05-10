const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const utils = require('./util').create();

module.exports = class BlockChain extends EventEmitter {

  constructor(opts) {

    super();

    this.defaults(opts);

    this.MINING_STATE = 0;
    this.address = this.opts.keyPair.publicKey;
    this.chain = [];
    this.current_transactions = [];

    this.validPowPrefix = '';

    for (var i = 0; i < this.opts.difficulty; i++) this.validPowPrefix += '0';

    this.on('block-mined', this.handleBlockMinedEvent.bind(this));

    if (this.opts.genesis) this.genesisBlock();
  }

  static create(opts) {
    return new BlockChain(opts);
  }

  genesisBlock() {
    this.newBlock(1, 100);
  }

  //proof of work
  //-------------

  pow(previousProof) {

    var nonce = 0;

    var lastBlockHash = utils.hashObj(this.lastBlock());

    while (!this.validProof(nonce, previousProof, lastBlockHash)) nonce++;

    return nonce;
  }

  validProof(nonce, previousProof, lastBlockHash) {

    var hash = utils.hash([nonce, previousProof, lastBlockHash].join(''));

    return hash.substring(0, this.opts.difficulty) == this.validPowPrefix;
  }

  //mining and blocks
  //-----------------

  newBlock(previousHash, proof) {

    var block = {
      'index': this.chain.length + 1,
      'timestamp': Date.now(),
      'transactions': utils.clone(this.current_transactions),
      'proof': proof,
      'previous_hash': previousHash || utils.hashObj(this.lastBlock()),
      'origin': this.address
    };

    this.current_transactions = [];

    this.chain.push(block);

    return block;
  }

  lastBlock() {
    return this.chain.slice(-1).pop();
  }

  mineStop() {
    this.MINING_STATE = 0;
  }

  mineStart() {
    this.MINING_STATE = 1;
    this.__mine();
  }

  __mine() {

    if (this.MINING_STATE != 1) return;

    if (this.current_transactions.length == 0) {
      this.emit('empty-tx-mine-wait', this.opts.emptyTransactionsWait);
      return setTimeout(this.__mine.bind(this), this.opts.emptyTransactionsWait);
    }

    var lastBlock = this.lastBlock();

    var proof = this.pow(lastBlock.proof);

    this.newTx({
      sender: "0",
      recipient: this.address,
      amount: 1,
      timestamp: Date.now()
    });

    var newBlock = this.newBlock(null, proof);

    this.emit('block-mined', newBlock);

    this.__mine();
  }

  pruneMinedTransactions(newBlock){

    this.current_transactions = this.current_transactions.filter((pendingTx) => {

      return !(newBlock.transactions.every((minedTx) => {
        return pendingTx.signature == minedTx.signature;
      }));
    });
  }

  //TODO: weakness, a malicious node may broadcast lots of invalid blocks - stopping valid nodes from mining, whilst maliciously mining new blocks
  handleBlockMinedEvent(newBlock) {

    if (newBlock.origin == this.address) return;//dont verify the block or stop mining

    var wasMining = false;

    if (this.MINING_STATE == 1) {
      wasMining = true;
      this.mineStop();
    }

    if (!this.validBlock(this.lastBlock(), newBlock)) return this.emit('block-rejected', {
      block: newBlock,
      origin: this.address
    });

    //now loop through pending transactions, remove those that are in our double checked block
    this.pruneMinedTransactions(newBlock);

    this.chain.push(newBlock);

    if (wasMining) this.mineStart();

    return this.emit('block-accepted', {
      block: newBlock,
      validator: this.address
    });
  }

  //transactions
  //--------------------

  acceptTx(tx) {

    this.current_transactions.push(tx);
    this.emit('tx-accepted', tx);
    return this.lastBlock().index + 1;
  }

  rejectTx(tx, txValid) {
    this.emit('tx-rejected', {tx: tx, failures: txValid});
  }

  checkSignature(tx) {
    try {
      return utils.verify(utils.hashObj({
        sender: tx.sender,
        recipient: tx.recipient,
        amount: tx.amount,
        timestamp: tx.timestamp
      }, 'base64'), tx.signature, tx.sender);
    } catch (e) {
      return false;
    }
  }

  verifyTx(tx) {

    var failures = [];

    if (tx.sender == null) failures.push('sender missing or invalid');
    if (!tx.recipient) failures.push('recipient missing or invalid');
    if (isNaN(tx.amount) || tx.amount == 0) failures.push('amount 0, missing or invalid');
    if (tx.sender != 0 && !this.checkSignature(tx)) failures.push('invalid signature');
    if (!tx.timestamp || Date.now() - tx.timestamp > this.opts.txTimestampWindow) failures.push('invalid timestamp or timestamp exceeds allowed time difference');

    return failures.length == 0 ? true : failures;
  }

  newTx(tx) {

    var txValid = this.verifyTx(tx);

    if (txValid !== true) return this.rejectTx(tx, txValid);

    return this.acceptTx(tx);
  }

  //consensus algorithms
  //--------------------

  validBlock(lastBlock, block) {

    if (block['previous_hash'] != utils.hashObj(lastBlock)) return false;

    return this.validProof(block['proof'], lastBlock['proof'], block['previous_hash']);
  }

  validChain(chain) {

    var lastBlock = chain[0];
    var currentIndex = 1;

    while (currentIndex < chain.length) {

      var block = chain[currentIndex];

      if (!this.validBlock(lastBlock, block)) return false;

      lastBlock = block;
      currentIndex += 1;
    }

    return true;
  }

  defaults(opts) {

    if (!opts) opts = {};
    if (!opts.difficulty) opts.difficulty = 4;
    if (!opts.txTimestampWindow) opts.txTimestampWindow = 300000;//5 minutes
    if (!opts.keyPair) opts.keyPair = utils.keyPair();
    if (!opts.emptyTransactionsWait) opts.emptyTransactionsWait = 10000;//10 seconds
    this.opts = opts;
  }

};