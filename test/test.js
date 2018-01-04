var request = require('supertest'),
  restify = require('restify'),
  should  = require('should'),
  session = require('../lib/session')({
    debug : true,
    ttl   : 2
  });
var cookie = require('cookie');

var server = restify.createServer();

server
  .use(session.useCookieParse)
  .use(session.sessionManager)
  .get('/', function(req, res){
    res.send({ success: true, session: req.session });
  });

server.listen(3000);

var resHeader = session.config.cookieHeader.toLowerCase();
var cookieName = session.config.cookieName;

var destroySession = function(context, sid, callback) {
  session.destroy(sid, function(status) {
    session.exists(sid, function(err, exists) {
      exists.should.be.false;
      callback.call(context);
    });
  });
};

var createSession = function(context, callback) {
  request(server)
    .get('/')
    .end(function(err, res){
      // var sid = res.headers[resHeader];
      var sids = res.headers[resHeader] || [];
      var cookies = cookie.parse(sids.join(''));
      console.log('sid=======' + cookies[cookieName])
      should.exist(cookies[cookieName]);
      callback.call(context, cookies[cookieName]);
    });
};



describe('Restify session manager', function(){
 /* describe('create a new session to expire', function(){
    var sid;
    it('should create a new session', function(done){
      // perform first request to create session
      createSession(this, function(newSid){
        sid = newSid;
        done();
      });
    });
    it('should wait for ttl and verify session data empty', function(done){
      this.timeout(session.config.ttl * 1000 + 5000);
      var defer = setTimeout(function() {
        session.exists(sid, function(err, exists) {
          exists.should.be.false;
          done();
        });
        clearTimeout(defer);
      }, session.config.ttl * 1000 + 1000);
    });
  });


  describe('destroy all sessions', function(){
    it('should remove all keys', function(done){
      session.destroyAll(function(){
        session.getAllKeys(function(err, keys){
          keys.should.have.length(0);
          done();
        });
      });
    });
  });*/

  describe('create a new session', function(){
    var sid;
    it('should create a new session', function(done){
      // perform first request to create session
      createSession(this, function(newSid){
        sid = newSid;
        done();
      });
    });
    it('should the session exists on the next request', function(done){
      // perform second request to verify that the session is alive
      request(server)
        .get('/')
        .set(session.config.cookieHeader, sid)
        .end(function(err, res){
          res.body.success.should.be.true;
          // the server return the same sid if is not expired
          var sids = res.headers[resHeader] || [];
          var cookies = cookie.parse(sids.join(''));
          // console.log(cookies)
          sid.should.equal(cookies[cookieName]);
          //sid.should.equal(res.body.session.sid);
          done();
        });
    });
    it('should destroy first session', function(done){
      destroySession(this, sid, done);
    });
    it('should fail to use fake session', function(done){
      // perform third request with a fake sid
      sid = 'fakesid';
      request(server)
        .get('/')
        .set(session.config.sidHeader, sid)
        .end(function(err, res){
          res.body.success.should.be.true;
          sid.should.not.equal(res.headers[resHeader]);
          sid = res.headers[resHeader];
          done();
        });
    });
    it('should destroy last session', function(done){
      destroySession(this, sid, done);
    });
  });
  /*
  // This test needs to be last since it destroys the connection to redis
  describe('disconnect from session', function () {
    it('should not be connected to the redis DB anymore', function (done) {
      session.client.connected.should.be.true;
      session.disconnect(function () {
        session.client.connected.should.be.false;
        done();
      });
    })
  });
  */
});
