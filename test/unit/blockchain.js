var path = require('path');
var filename = path.basename(__filename);
var expect = require('expect.js');


describe('unit/' + filename, function () {

  it('initializes the BlockChain object', function (done) {

    const BlockChain = require('../../lib/blockchain');
    const blockchain = new BlockChain();

    done();
  });

  it('pushes a transaction into the blockchain', function (done) {

    const BlockChain = require('../../lib/blockchain');
    const blockchain = new BlockChain();
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

    blockchain.on('tx-accepted', function(tx){

      done();
    });

    blockchain.on('tx-rejected', function(rejected){

      console.log(rejected);

      done(new Error('unexpected'));
    });

    blockchain.newTx(tx);
  });

  it('pushes an unsigned transaction into the blockchain which is rejected', function (done) {

    const BlockChain = require('../../lib/blockchain');
    const blockchain = new BlockChain();
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

    blockchain.on('tx-rejected', function(rejected){

      expect(rejected.failures[0]).to.be('invalid signature');
      done();
    });

    blockchain.newTx(tx);
  });

  it('mines a new block', function (done) {

    const BlockChain = require('../../lib/blockchain');
    const blockchain = new BlockChain({emptyTransactionsWait:1000});
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

    blockchain.once('tx-accepted', function(tx){

      blockchain.on('block-mined', function(newBlock){

        expect(newBlock.index).to.not.be(null);
        expect(newBlock.timestamp).to.not.be(null);
        expect(newBlock.transactions).to.not.be(null);
        expect(newBlock.proof).to.not.be(null);
        expect(newBlock.previous_hash).to.not.be(null);

        blockchain.on('empty-tx-mine-wait', function(ms){
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

    const BlockChain = require('../../lib/blockchain');
    const blockchain = new BlockChain({emptyTransactionsWait:1000});
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

    blockchain.once('tx-accepted', function(tx){

      blockchain.on('block-mined', function(newBlock){

        expect(newBlock.index).to.not.be(null);
        expect(newBlock.timestamp).to.not.be(null);
        expect(newBlock.transactions).to.not.be(null);
        expect(newBlock.proof).to.not.be(null);
        expect(newBlock.previous_hash).to.not.be(null);

        blockchain.on('empty-tx-mine-wait', function(ms){

          blockchain.mineStop();
          //test the validChain on the existing chain
          expect(blockchain.validChain(blockchain.chain)).to.be(true);

          done();
        });
      });
      blockchain.mineStart();
    });

    blockchain.newTx(tx);
  });

  it('connects 2 blockchains via the events layer, adds tx to one checks both blockchains are consistent and the second chain carries on mining', function (done) {

    const BlockChain = require('../../lib/blockchain');
    const blockchain1 = new BlockChain({emptyTransactionsWait:1000});
    const blockchain2 = new BlockChain({emptyTransactionsWait:1000});
    const utils = require('../../lib/util').create();

    blockchain2.chain = utils.clone(blockchain1.chain);//genesis block is the same, when you join the chain via the network,
                                                       // you would fetch the chain from the peer you have connected to

    blockchain1.mineStart();
    blockchain2.mineStart();

    //this would be where the pubsub service allows these events to permeate
    blockchain1.on('block-mined', function(newBlock){
      blockchain2.emit('block-mined', newBlock);
    });

    blockchain2.on('block-accepted', function(){

      expect(blockchain1.chain).to.eql(blockchain2.chain);

      blockchain2.once('empty-tx-mine-wait', function(){
        blockchain1.mineStop();
        blockchain2.mineStop();
        done();
      });
    });

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
});
