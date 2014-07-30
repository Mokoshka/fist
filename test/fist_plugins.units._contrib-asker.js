/*global describe, it */
'use strict';

var _ = require('lodash-node');
var assert = require('chai').assert;
var vowAsker = require('vow-asker');
var fist = require('../fist');
var sock = require('./util/sock');
var fs = require('fs');

describe('fist_plugins/units/_contrib-asker', function () {

    it('Should respond with expected value (0)', function (done) {

        var app = fist();
        var origServer;

        app.route('/', 'front');
        app.route('/backend/', 'back');

        app.unit({
            path: 'front',
            deps: ['model'],
            data: function (track, context) {
                assert.ok(!context.getErr('model'));

                return context.track.send(context.getRes('model'));
            }
        });

        app.unit({
            path: 'model',
            base: '_contrib-asker',
            _$options: function (context) {

                return _.extend(this.__base(context), {
                    path: '/backend/',
                    socketPath: sock
                });
            }
        });

        app.unit({
            path: 'back',
            data: function (track, context) {

                return context.track.send({x: 42});
            }
        });

        try {
            fs.unlinkSync(sock);
        } catch (err) {}

        origServer = app.listen(sock);

        vowAsker({
            path: '/',
            socketPath: sock
        }).done(function (res) {
            assert.deepEqual(res.data, new Buffer('{"x":42}'));
            origServer.close();
            done();
        });
    });

    it('Should respond with expected value (1)', function (done) {

        var app = fist();
        var origServer;

        app.route('/', 'front');
        app.route('/backend/', 'back');

        app.unit({
            path: 'front',
            deps: ['model'],
            data: function (track, context) {
                assert.ok(!context.getErr('model'));

                return context.track.send(context.getRes('model'));
            }
        });

        app.unit({
            path: 'model',
            base: '_contrib-asker',
            _$options: function (context) {

                return _.extend(this.__base(context), {
                    path: '/<token>/',
                    socketPath: sock,
                    vars: {
                        token: 'backend'
                    }
                });
            }
        });

        app.unit({
            path: 'back',
            data: function (track, context) {

                return context.track.send({x: 42});
            }
        });

        try {
            fs.unlinkSync(sock);
        } catch (err) {}

        origServer = app.listen(sock);

        vowAsker({
            path: '/',
            socketPath: sock
        }).done(function (res) {
            assert.deepEqual(res.data, new Buffer('{"x":42}'));
            origServer.close();
            done();
        });
    });

    it('Should respond with expected value (2)', function (done) {

        var app = fist();
        var origServer;

        app.route('/', 'front');

        app.unit({
            path: 'front',
            deps: ['model'],
            data: function (track, context) {

                return context.track.send(context.getErr('model'));
            }
        });

        app.unit({
            path: 'model',
            base: '_contrib-asker',
            _$request: function () {

                throw 42;
            }
        });

        try {
            fs.unlinkSync(sock);
        } catch (err) {}

        origServer = app.listen(sock);

        vowAsker({
            path: '/',
            socketPath: sock,
            statusFilter: function () {

                return {
                    accept: true
                };
            }

        }).done(function (res) {
            assert.deepEqual(res.data, new Buffer('42'));
            origServer.close();
            done();
        });
    });

    it('Should respond with expected value (3)', function (done) {

        var app = fist();
        var origServer;

        app.route('/', 'front');

        app.unit({
            path: 'front',
            deps: ['model'],
            data: function (track, context) {

                return context.track.send(context.getErr('model'));
            }
        });

        app.unit({
            path: 'model',
            base: '_contrib-asker',
            _$request: function () {

                throw 42;
            }
        });

        try {
            fs.unlinkSync(sock);
        } catch (err) {}

        origServer = app.listen(sock);

        vowAsker({
            path: '/',
            socketPath: sock,
            statusFilter: function () {

                return {
                    accept: true
                };
            }

        }).done(function (res) {
            assert.deepEqual(res.data, new Buffer('42'));
            origServer.close();
            done();
        });
    });

    it('Should respond with expected value (4)', function (done) {

        var app = fist();
        var origServer;

        app.route('/', 'front');

        app.unit({
            path: 'front',
            deps: ['model'],
            data: function (track, context) {
                assert.ok(context.getErr('model'));

                throw context.getErr('model');
            }
        });

        app.unit({
            path: 'model',
            base: '_contrib-asker',
            _$options: function () {

                return {
                    path: '/foo-bar/',
                    sock: sock
                };
            }
        });

        try {
            fs.unlinkSync(sock);
        } catch (err) {}

        origServer = app.listen(sock);

        vowAsker({
            path: '/',
            socketPath: sock
        }).done(null, function (err) {
            assert.ok(err);
            origServer.close();
            done();
        });
    });

});
