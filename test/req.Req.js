/*global describe, it*/
'use strict';

var Url = require('fast-url-parser');

var _ = require('lodash-node');
var assert = require('chai').assert;
var http = require('./util/http');

describe('fist/req/Req', function () {
    /*eslint max-nested-callbacks: [2, 5]*/
    var Req = require('../req/Req');

    it('Should be an instance of fist/req/Req', function (done) {
        http({}, function (rq, rs) {
            var req = new Req(rq, {a: 5});
            assert.property(req, 'params');
            assert.isObject(req.params);
            assert.deepEqual(req.params, {a: 5});
            rs.end();
        }, function (err) {
            assert.ok(!err);
            done();
        });
    });

    describe('.getUrl', function () {
        it('Should correctly parse request url', function (done) {
            http({path: '/test/'}, function (rq, rs) {

                var req = new Req(rq);

                assert.deepEqual(req.getUrl(),
                    Url.parse('http://localhost/test/', true));

                rs.end();
            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

        it('Should get host from x-forwarder-host:', function (done) {
            http({
                path: '/test/',
                headers: {
                    'x-forwarded-host': 'fist.io'
                }
            }, function (rq, rs) {
                var req = new Req(rq);

                assert.deepEqual(req.getUrl(),
                    Url.parse('http://fist.io/test/', true));

                rs.end();
            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

        it('Should recognize protocol as https:', function (done) {
            http({
                path: '/test/'
            }, function (rq, rs) {
                //  test hack
                rq.socket.encrypted = true;

                var req = new Req(rq);

                assert.deepEqual(req.getUrl(),
                    Url.parse('https://localhost/test/', true));

                rs.end();
            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

        it('Should get protocol from x-forwarded-proto', function (done) {
            http({
                path: '/test/',
                headers: {
                    'x-forwarded-proto': 'https'
                }
            }, function (rq, rs) {

                var req = new Req(rq);

                assert.deepEqual(req.getUrl(),
                    Url.parse('https://localhost/test/', true));

                rs.end();
            }, function (err) {
                assert.ok(!err);
                done();
            });
        });
    });

    describe('.getHeaders', function () {

        it('Should return all headers object', function (done) {
            http({
                headers: {
                    test: 'ok'
                },
                path: '/test/'
            }, function (rq, rs) {

                var req = new Req(rq);
                var headers = req.getHeaders();
                assert.strictEqual(headers.test, 'ok');

                rs.end();

            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

        it('Should be case insensitive', function (done) {

            http({
                headers: {
                    test: 'ok'
                },
                path: '/test/'
            }, function (rq, rs) {

                var req = new Req(rq);

                assert.strictEqual(req.getHeader('TEST'), 'ok');
                assert.strictEqual(req.getHeader('Test'), 'ok');
                assert.strictEqual(req.getHeader('test'), 'ok');

                rs.end();

            }, function (err) {
                assert.ok(!err);
                done();
            });
        });
    });

    describe('.getCookies', function () {
        it('Should return an empty object', function (done) {
            http({
                Cookies: null
            }, function (rq, rs) {

                var cookies;
                var req = new Req(rq);

                cookies = req.getCookies();
                assert.ok(_.isEmpty(cookies));

                rs.end();
            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

        it('Should parse cookies at once', function (done) {
            http({
                headers: {
                    Cookie: 'name=value; x=5'
                }
            }, function (rq, rs) {

                var cookies;
                var req = new Req(rq);
                cookies = req.getCookies();

                assert.strictEqual(cookies, req.getCookies());

                rs.end();
            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

        it('Should return a {name: value} object', function (done) {
            http({
                headers: {
                    Cookie: 'name=value; x=5'
                }
            }, function (rq, rs) {

                var cookies;
                var req = new Req(rq);

                cookies = req.getCookies();

                assert.deepEqual(cookies, {
                    name: 'value',
                    x: '5'
                });

                rs.end();
            }, function (err) {
                assert.ok(!err);
                done();
            });
        });
    });

    describe('.getCookie', function () {

        it('Should return cookie value by name', function (done) {
            http({
                headers: {
                    Cookie: 'name=value; x=5'
                }
            }, function (rq, rs) {

                var req = new Req(rq);

                assert.strictEqual(req.getCookie('name'), 'value');
                assert.strictEqual(req.getCookie('x'), '5');
                assert.isUndefined(req.getCookie('z'));

                rs.end();
            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

    });

    describe('.getBody', function () {

        it('Should return parsed request body', function (done) {
            http({
                method: 'POST',
                body: 'TEST'
            }, function (rq, rs) {

                var req = new Req(rq);

                req.getBody().done(function (body) {
                    assert.deepEqual(body.input, new Buffer('TEST'));
                    rs.end();
                });

            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

        it('Should should parse body at once', function (done) {
            http({
                method: 'POST',
                body: 'TEST'
            }, function (rq, rs) {

                var req = new Req(rq);
                var body = req.getBody();

                assert.strictEqual(body, req.getBody());

                rs.end();
            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

        it('Should fail on wrong content type', function (done) {
            http({
                method: 'POST',
                body: 'TEST'
            }, function (rq, rs) {

                rq.headers['content-type'] = 'wrong';

                var req = new Req(rq);

                req.getBody().done(null, function (err) {
                    assert.instanceOf(err, Error);
                    rs.end();
                });

            }, function (err) {
                assert.ok(!err);
                done();
            });
        });

        it('Should not fail if content-type does not exist', function (done) {
            http({
                method: 'POST',
                body: 'TEST'
            }, function (rq, rs) {

                delete rq.headers['content-type'];

                var req = new Req(rq);

                req.getBody().done(function (body) {
                    assert.deepEqual(body.input, new Buffer('TEST'));
                    rs.end();
                });

            }, function (err) {
                assert.ok(!err);
                done();
            });
        });
    });
});
