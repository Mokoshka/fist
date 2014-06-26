'use strict';

var Framework = require('../../Framework');

var asker = require('asker');
var sock = require('../stuff/sock');

var Router = require('finger/Router');
var Fs = require('fs');

module.exports = {
    Framework: [
        function (test) {
            var framework = new Framework();
            test.deepEqual(framework.renderers, {});
            test.ok(framework.router instanceof Router);
            test.done();
        }
    ],
    'Framework.prototype.route': [
        function (test) {
            var framework = new Framework();
            framework.route('/', 'index');
            test.deepEqual(framework.router.getRoute('index').data, {
                name: 'index',
                unit: 'index'
            });
            framework.route('/', {
                name: 'index'
            });
            test.deepEqual(framework.router.getRoute('index').data, {
                name: 'index',
                unit: 'index'
            });
            framework.route('/', {
                name: 'index',
                unit: null
            });
            test.deepEqual(framework.router.getRoute('index').data, {
                name: 'index',
                unit: 'index'
            });
            framework.route('/', {
                name: 'index',
                unit: 'unit'
            });
            test.deepEqual(framework.router.getRoute('index').data, {
                name: 'index',
                unit: 'unit'
            });
            test.done();
        }
    ],
    'Framework.prototype._handle': [
        function (test) {
            var framework = new Framework();

            framework.on('sys:request', function (track) {
                track.send(201);
            });

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 201);
                test.done();
            });
        },
        function (test) {
            var framework = new Framework();

            framework.plug(function (done) {
                setTimeout(function () {
                    done();
                }, 100);
            });

            framework.route('/', 'index');

            framework.unit({
                path: 'index',
                data: function (track) {
                    track.send(201);
                }
            });

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 201);
                test.done();
            });
        },
        function (test) {
            var framework = new Framework();

            framework.route('/', 'index');

            framework.unit({
                path: 'index',
                data: function (track) {
                    track.send(201);
                }
            });

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 201);
                test.done();
            });
        },
        function (test) {
            var framework = new Framework();

            framework.plug(function (done) {
                done('ERR');
            });

            framework.route('/', 'index');

            framework.unit({
                path: 'index',
                data: function (track) {
                    track.send(201);
                }
            });

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock,
                statusFilter: function () {

                    return {
                        accept: true
                    };
                }
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 500);
                test.deepEqual(res.data, new Buffer('ERR'));
                test.done();
            });
        },
        function (test) {
            var spy = [];
            var framework = new Framework();

            framework.route('/foo/');

            framework.on('sys:ematch', function () {
                spy.push(1);
            });

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock,
                statusFilter: function () {

                    return {
                        accept: true
                    };
                }
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 404);
                test.deepEqual(spy, [1]);
                test.done();
            });
        },
        function (test) {
            var spy = [];
            var framework = new Framework();

            framework.on('sys:ematch', function () {
                spy.push(1);
            });

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock,
                statusFilter: function () {

                    return {
                        accept: true
                    };
                }
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 501);
                test.deepEqual(spy, [1]);
                test.done();
            });
        },
        function (test) {
            var spy = [];
            var framework = new Framework();

            framework.route('GET /foo/', 'foo');
            framework.route('POST /', 'upload');

            framework.on('sys:ematch', function () {
                spy.push(1);
            });

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock,
                statusFilter: function () {

                    return {
                        accept: true
                    };
                }
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 405);
                test.strictEqual(res.headers.allow, 'POST');
                test.deepEqual(spy, [1]);
                test.done();
            });
        },
        function (test) {
            var framework = new Framework();

            framework.route('GET /', 'foo');

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock,
                statusFilter: function () {

                    return {
                        accept: true
                    };
                }
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 500);
                test.done();
            });
        },
        function (test) {
            var spy = [];
            var framework = new Framework();

            framework.route('GET /', 'foo');

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.unit({
                path: 'foo',
                deps: ['bar'],
                data: function (track) {
                    spy.push(2);
                    test.ok(track.res.hasResponded());
                    return track.send(43);
                }
            });

            framework.unit({
                path: 'bar',
                data: function (track) {
                    spy.push(1);
                    return track.send(42);
                }
            });

            framework.on('sys:response', function () {
                spy.push(3);
            });

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock,
                statusFilter: function () {

                    return {
                        accept: true
                    };
                }
            }, function (err, res) {
                test.ok(!err);
                test.deepEqual(res.data + '', new Buffer('42') + '');
                setTimeout(function () {
                    test.deepEqual(spy, [1, 3]);
                    test.done();
                }, 50);
            });
        },
        function (test) {
            var framework = new Framework();

            framework.route('GET /', 'foo');

            framework.on('sys:match', function (track) {
                track.send(201);
            });

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock,
                statusFilter: function () {

                    return {
                        accept: true
                    };
                }
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 201);
                test.done();
            });
        },
        function (test) {
            var framework = new Framework();

            framework.route('/', 'preset');
            framework.route('/', 'index');

            framework.unit({
                path: 'preset',
                data: function (track) {
                    track.url.query.role = 'admin';
                }
            });

            framework.unit({
                path: 'index',
                data: function (track) {
                    test.deepEqual(track.url.query, {
                        role: 'admin'
                    });
                    track.send(201);
                }
            });

            try {
                Fs.unlinkSync(sock);
            } catch (err) {}

            framework.listen(sock);

            asker({
                path: '/',
                socketPath: sock
            }, function (err, res) {
                test.ok(!err);
                test.strictEqual(res.statusCode, 201);
                test.done();
            });
        }
    ]
};
