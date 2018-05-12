var path = require('path');
var filename = path.basename(__filename);
var expect = require('expect.js');
var async = require('async');

describe('unit/' + filename, function () {

  this.timeout(10000);

  it('initializes the db with empty opts, checks defaults', function (done) {

    var db = require('../../lib/db').create();

    done();
  });

  it('it pushes a bunch of records into a db set, is able to iterate through the records both forwards and backwards', function (done) {

    var db = require('../../lib/db').create();

    db.on('db/started', ()=>{

      async.timesSeries(10, function(time1, timeCb1){

        db.data.get('fork/0/' + (time1).toString()).put({index: time1}).once(function(){
          timeCb1();
        });

      }, function(e){

        if (e) return done(e);

        async.timesSeries(10, function(time2, timeCb2){

          db.data.get('fork/0/' + (time2).toString()).open(function(block){

            expect(block.index).to.be(time2);

            timeCb2();
          });

        }, done);
      });
    });

    db.start();
  });
});
