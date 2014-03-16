'use strict';

var Framework = require('../../Framework');
var Fs = require('fs');
var Vow = require('vow');

var asker = require('asker');
var block = require('../util/block');
var sock = require('../stuff/conf/sock');

module.exports = {

    ready: [
        function (test) {
            var fist = new Framework();
            var spy = [];

            fist.on('sys:pending', function () {
                spy.push(0);
            });

            fist.on('sys:ready', function () {
                spy.push(1);
            });

            fist.ready();

            test.deepEqual(spy, [0, 1]);

            test.done();
        },

        function (test) {
            var fist = new Framework();
            var spy = [];

            fist.schedule(function (done) {
                setTimeout(function () {
                    done(null, null);
                }, 10);
            });

            fist.on('sys:pending', function () {
                spy.push(0);
            });

            fist.on('sys:ready', function () {
                spy.push(1);
                test.deepEqual(spy, [0, 1]);
                test.done();
            });

            fist.ready();
        },

        function (test) {

            var fist = new Framework();
            var spy = [];

            fist.schedule(function (done) {
                setTimeout(function () {
                    spy.push(1);
                    done(null, null);
                }, 10);
            });

            fist.on('sys:pending', function () {
                spy.push(0);
            });

            fist.on('sys:ready', function () {
                spy.push(3);
                test.deepEqual(spy, [0, 1, 2, 3]);
                test.done();
            });

            fist.ready();

            fist.schedule(function (done) {
                setTimeout(function () {
                    spy.push(2);
                    done(null, null);
                }, 15);
            });

            fist.ready();
        },

        function (test) {

            var fist = new Framework();
            var spy = [];

            fist.schedule(function (done) {
                done(42);
            });

            fist.schedule(function (done) {
                done(43);
            });

            fist.on('sys:pending', function () {
                spy.push(0);
            });

            fist.on('sys:error', function (err) {
                spy.push(1);
                test.strictEqual(err, 42);
                test.deepEqual(spy, [0, 1]);
                test.done();
            });

            fist.ready();
        }
    ],

    _call: [
        function (test) {

            var fist = new Framework();

            fist.decl('index', function (connect, errors, result, done) {
                done(null, 42);
            });

            fist.route('GET', '/', 'index');

            try {
                Fs.unlinkSync(sock);
            } catch (ex) {}

            fist.listen(sock);

            asker({
                method: 'GET',
                path: '/',
                socketPath: sock
            }, function (err, res) {
                test.deepEqual(res.data, new Buffer('42'));
                test.done();
            });
        },

        function (test) {

            var fist = new Framework();

            fist.decl('index', Vow.resolve(42));
            fist.route('GET', '/', 'index');

            try {
                Fs.unlinkSync(sock);
            } catch (ex) {}

            fist.listen(sock);

            asker({
                method: 'GET',
                path: '/',
                socketPath: sock
            }, function (err, res) {
                test.deepEqual(res.data, new Buffer('42'));
                test.done();
            });
        }
    ],

    _handle: [
        function (test) {

            var fist = new Framework();

            var d = new Date();

            fist.schedule(function (done) {
                setTimeout(function () {
                    done(null, null);
                }, 100);
            });

            fist.decl('index', function () {

                return 42;
            });

            fist.route('GET', '/', 'index');

            try {
                Fs.unlinkSync(sock);
            } catch (ex) {}

            fist.listen(sock);

            asker({
                method: 'GET',
                path: '/',
                socketPath: sock
            }, function (err, res) {
                test.ok(d.getTime() <= Date.now());
                test.deepEqual(res.data, new Buffer('42'));
                test.done();
            });

        },
        function (test) {

            var fist = new Framework();

            try {
                Fs.unlinkSync(sock);
            } catch (ex) {}

            fist.listen(sock);

            setTimeout(function () {
                asker({
                    method: 'GET',
                    path: '/',
                    socketPath: sock,
                    statusFilter: function () {
                        return {
                            accept: true
                        };
                    }
                }, function (err, res) {
                    test.strictEqual(res.statusCode, 503);
                    test.done();
                });
            }, 550);

            block();
        }
    ]
};
