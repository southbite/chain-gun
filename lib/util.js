const crypto = require('crypto');
const CryptoUtil = require('happn-util-crypto');
const cryptoUtil = new CryptoUtil();
const hyperid = require('hyperid');

module.exports = class Utils {

  constructor() {
    this.id = hyperid();
  }

  static create(){
    return new Utils();
  }

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  hashObj(obj, outputEncoding, algorithm) {
    return this.hash(JSON.stringify(obj, Object.keys(obj).sort()), outputEncoding, algorithm);
  }

  hash(input, outputEncoding, algorithm) {

    if (!outputEncoding) outputEncoding = 'hex';
    if (!algorithm) algorithm = 'sha256';

    return cryptoUtil.createHashFromString(input, outputEncoding, algorithm);
  }

  sign(data, privateKey) {

    return cryptoUtil.sign(data, privateKey)
  }

  verify(data, digest, publicKey) {

    return cryptoUtil.verify(data, digest, publicKey);
  };

  keyPair() {

    return cryptoUtil.createKeyPair();
  }
};
