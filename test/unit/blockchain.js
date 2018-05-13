var path = require('path');
var filename = path.basename(__filename);
var expect = require('expect.js');


describe('unit/' + filename, function () {

  it('initializes the BlockChain object', function (done) {

    const blockchain = require('../../lib/blockchain').create({genesis: true});

    done();
  });

  it('pushes a transaction into the blockchain', function (done) {

    const blockchain = require('../../lib/blockchain').create({genesis: true});
    const utils = require('../../lib/util').create();

    var senderKeyPair = utils.keyPair();
    var recipientKeyPair = utils.keyPair();

    var txTimestamp = Date.now();

    var tx = {
      sender: senderKeyPair.publicKey,
      recipient: recipientKeyPair.publicKey,
      amount: 10,
      timestamp: txTimestamp
    };

    tx.signature = utils.sign(utils.hashObj(tx, 'base64'), senderKeyPair.privateKey);

    blockchain.on('tx-accepted', function (tx) {

      done();
    });

    blockchain.on('tx-rejected', function (rejected) {
      done(new Error('unexpected'));
    });

    blockchain.newTx(tx);
  });

  it('pushes an unsigned transaction into the blockchain which is rejected', function (done) {

    const blockchain = require('../../lib/blockchain').create({genesis: true});
    const utils = require('../../lib/util').create();

    var senderKeyPair = utils.keyPair();
    var recipientKeyPair = utils.keyPair();

    var txTimestamp = Date.now();

    var tx = {
      sender: senderKeyPair.publicKey,
      recipient: recipientKeyPair.publicKey,
      amount: 10,
      timestamp: txTimestamp
    };

    blockchain.on('tx-rejected', function (rejected) {

      expect(rejected.failures[0]).to.be('invalid signature');
      done();
    });

    blockchain.newTx(tx);
  });

  it('tests pruning existing tx\'s', function (done) {

    const blockchain = require('../../lib/blockchain').create({genesis: true, emptyTransactionsWait: 1000});

    blockchain.current_transactions = [
      {signature: 0},
      {signature: 1},
      {signature: 2},
      {signature: 3},
      {signature: 4}
    ];

    blockchain.pruneMinedTransactions({
      transactions: [
        {signature: 1},
        {signature: 3}
      ]
    });

    expect(blockchain.current_transactions).to.eql([
      {signature: 0},
      {signature: 2},
      {signature: 4}]);

    done();
  });

  it('mines a new block', function (done) {

    const blockchain = require('../../lib/blockchain').create({genesis: true, emptyTransactionsWait: 1000});
    const utils = require('../../lib/util').create();

    var senderKeyPair = utils.keyPair();
    var recipientKeyPair = utils.keyPair();

    var txTimestamp = Date.now();

    var tx = {
      sender: senderKeyPair.publicKey,
      recipient: recipientKeyPair.publicKey,
      amount: 10,
      timestamp: txTimestamp
    };

    tx.signature = utils.sign(utils.hashObj(tx, 'base64'), senderKeyPair.privateKey);

    blockchain.once('tx-accepted', function (tx) {

      blockchain.on('block-accepted', function (newBlock) {

        expect(newBlock.index).to.not.be(null);
        expect(newBlock.timestamp).to.not.be(null);
        expect(newBlock.transactions).to.not.be(null);
        expect(newBlock.proof).to.not.be(null);
        expect(newBlock.previous_hash).to.not.be(null);

        blockchain.on('empty-tx-mine-wait', function (ms) {
          expect(ms).to.be(1000);
          blockchain.mineStop();
          done();
        });
      });
      blockchain.mineStart();
    });

    blockchain.newTx(tx);
  });

  it('mines a new block, tests the validChain method', function (done) {

    const blockchain = require('../../lib/blockchain').create({genesis: true});
    const utils = require('../../lib/util').create();

    var senderKeyPair = utils.keyPair();
    var recipientKeyPair = utils.keyPair();

    var txTimestamp = Date.now();

    var tx = {
      sender: senderKeyPair.publicKey,
      recipient: recipientKeyPair.publicKey,
      amount: 10,
      timestamp: txTimestamp
    };

    tx.signature = utils.sign(utils.hashObj(tx, 'base64'), senderKeyPair.privateKey);

    var chain = [];

    blockchain.once('tx-accepted', function (tx) {

      blockchain.on('block-accepted', function (newBlock) {

        expect(newBlock.index).to.not.be(null);
        expect(newBlock.timestamp).to.not.be(null);
        expect(newBlock.transactions).to.not.be(null);
        expect(newBlock.proof).to.not.be(null);
        expect(newBlock.previous_hash).to.not.be(null);

        chain.push(newBlock);

        blockchain.on('empty-tx-mine-wait', function (ms) {

          blockchain.mineStop();
          //test the validChain on the existing chain
          expect(blockchain.validChain(chain)).to.be(true);

          done();
        });
      });
      blockchain.mineStart();
    });

    blockchain.newTx(tx);
  });

  it('connects 2 blockchains via the events layer, adds tx to one checks both blockchains are consistent and the second chain carries on mining', function (done) {

    this.timeout(10000);

    const blockchain1 = require('../../lib/blockchain').create({genesis: true, emptyTransactionsWait: 1000});
    const blockchain2 = require('../../lib/blockchain').create({emptyTransactionsWait: 1000});

    const utils = require('../../lib/util').create();

    blockchain2.last_block = blockchain1.last_block;
    blockchain2.current_index = blockchain1.current_index;

    //this would be where the pubsub service allows these events to permeate
    blockchain1.on('block-mined', function (newBlock) {
      blockchain2.emit('block-mined', newBlock);
    });

    blockchain2.on('block-accepted', function (acceptedBlock) {

      expect(blockchain1.last_block).to.eql(blockchain2.last_block);

      blockchain2.once('empty-tx-mine-wait', function () {
        blockchain1.mineStop();
        blockchain2.mineStop();
        done();
      });
    });

    blockchain1.mineStart();
    blockchain2.mineStart();

    var senderKeyPair = utils.keyPair();
    var recipientKeyPair = utils.keyPair();

    var txTimestamp = Date.now();

    var tx = {
      sender: senderKeyPair.publicKey,
      recipient: recipientKeyPair.publicKey,
      amount: 10,
      timestamp: txTimestamp
    };

    tx.signature = utils.sign(utils.hashObj(tx, 'base64'), senderKeyPair.privateKey);
    blockchain1.newTx(tx);
  });

  it('connects 2 blockchains via the events layer, adds tx\'s to both checks both blockchains are consistent after 10 blocks have been mined randomly by both', function (done) {

    this.timeout(20000);

    const blockchain1 = require('../../lib/blockchain').create({genesis: true, emptyTransactionsWait: 1000});
    const blockchain2 = require('../../lib/blockchain').create({emptyTransactionsWait: 1000});

    const utils = require('../../lib/util').create();

    blockchain2.last_block = blockchain1.last_block;
    blockchain2.current_index = blockchain1.current_index;

    var blockchain1Chain = {};
    var blockchain2Chain = {};

    blockchain1Chain['fork/0/1'] = blockchain1.last_block;
    blockchain2Chain['fork/0/1'] = blockchain1.last_block;

    //this would be where the pubsub service allows these events to permeate
    blockchain1.on('block-mined', function (newBlock) {
      console.log('new block mined by 1...');
      blockchain2.handleBlockMinedEvent(newBlock);
    });

    blockchain2.on('block-mined', function (newBlock) {
      console.log('new block mined by 2...');
      blockchain1.handleBlockMinedEvent(newBlock);
    });

    blockchain1.on('block-accepted', function (acceptedBlock) {
      blockchain1Chain['fork/0/' + acceptedBlock.block.index] = acceptedBlock.block;
    });

    var blockCount = 0;

    blockchain2.on('block-accepted', (acceptedBlock) => {

      blockCount++;

      blockchain2Chain['fork/0/' + acceptedBlock.block.index] = acceptedBlock.block;

      if (blockCount == 10) {

        blockchain1.mineStop();
        blockchain2.mineStop();

        clearInterval(txInterval1);
        clearInterval(txInterval2);

        setTimeout(()=> {

          expect(Object.keys(blockchain1Chain).sort()).to.eql(Object.keys(blockchain2Chain).sort());

          var chain1Array = Object.keys(blockchain1Chain).map(function (key) {
            return blockchain1Chain[key];
          });

          var chain2Array = Object.keys(blockchain2Chain).map(function (key) {
            return blockchain2Chain[key];
          });

          expect(chain1Array).to.eql(chain2Array);

          expect(blockchain2.validChain(chain1Array)).to.be(true);
          expect(blockchain1.validChain(chain2Array)).to.be(true);

          done();

        }, 1000);
      }
    });

    blockchain1.mineStart();

    blockchain2.mineStart();

    var txInterval1 = setInterval(function () {

      var senderKeyPair = utils.keyPair();
      var recipientKeyPair = utils.keyPair();

      var txTimestamp = Date.now();

      var tx = {
        sender: senderKeyPair.publicKey,
        recipient: recipientKeyPair.publicKey,
        amount: 10,
        timestamp: txTimestamp
      };

      tx.signature = utils.sign(utils.hashObj(tx, 'base64'), senderKeyPair.privateKey);
      blockchain1.newTx(tx);

    }, 500);

    var txInterval2 = setInterval(function () {

      var senderKeyPair = utils.keyPair();
      var recipientKeyPair = utils.keyPair();

      var txTimestamp = Date.now();

      var tx = {
        sender: senderKeyPair.publicKey,
        recipient: recipientKeyPair.publicKey,
        amount: 10,
        timestamp: txTimestamp
      };

      tx.signature = utils.sign(utils.hashObj(tx, 'base64'), senderKeyPair.privateKey);
      blockchain2.newTx(tx);

    }, 500);

  });
});
