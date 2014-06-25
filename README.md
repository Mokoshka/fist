fist [![Build Status](https://travis-ci.org/fistlabs/fist.png?branch=master)](https://travis-ci.org/fistlabs/fist)
=========
```Fist``` - это nodejs-фреймворк для написания серверных приложений. ```Fist``` предлагает архитектуру, поддержка которой одинаково проста как для простых так и для сложных web-серверов.
```js
var Fist = require('fist/Framework');
var fist = new Fist();

fist.unit({
    path: 'time.appstart', 
    data: new Date()
});

fist.unit({
    path: 'time.uptime',
    deps: ['time.appstart'],
    data: function (track, ctx) {
        return new Date() - ctx.getRes('time.appstart')
    }
});

fist.unit({
    path: 'index', 
    deps: ['time.uptime'], 
    data: function (track, ctx) {
        track.header('Content-Type', 'text/html');
        return track.send(200, '<div>Server uptime: ' + ctx.getRes('time.uptime') + 'ms</div>');
    }
});

fist.route('GET /', 'index');

fist.listen(1337);
```

Приложение фреймворка представляет собой плагинизируемый веб-сервер, состоящий из множества взаимосвязанных, зависящих друг от друга узлов, один из которых может обработать поступивший запрос, принятый роутером.

Приходящий в сервер запрос матчится первый подходящий локейшен, описанный в роутере. Каждый локейшен должен быть ассоциирован с узлом, операция разрешения которого запускается при успешном матчинге. Как правило, узел, ассоциированный с локейшеном является контролером и может выполнить ответ приложения. Но если он этого не сделает, то матчинг продолжится и операция повторится уже на другом узле, до тех пор пока один из узлов не выполнит ответ.

```js
//  при любом запросе проверять права на просмотр страницы
//  может отправить например 403 если прав нет
fist.route('/ e', {
    name: 'checkRights',
    unit: 'rightChecker'
});

//  отображает главную страницу если есть права
fist.route('/', {
    name: 'indexPage',
    unit: 'indexPageController'
});

//  настройки приложения
fist.route('/settings/', {
    name: 'settingsPage',
    unit: 'settingsPageController'
});

//  далее идет декларация узлов
//  ***
```

Узлом приложения является инстанс класса [```fist/unit/Unit```]('unit/Unit.js').
Каждый узел должен иметь некоторый идентификатор и имплементирать метод ```data```, в который отвечает за разрешение узла. Узлы могут зависеть друг от друга, что должно быть указано в декларации. Это значит что до того как выполнится текущий узел, будут выполнены его зависимости, результаты которых будут доступны в методе ```data```.

```js
fist.unit({
    path: 'content.news',
    data: function (track, ctx) {
        
        doRequestForNews(function (err, res) {
            if ( err ) {
                ctx.reject(err);
            } else {
                ctx.resolve(res);
            }
        });
        
        return ctx.promise();
    }
});

fist.unit({
    path: 'indexPage',
    deps: ['content.news'],
    data: function (track, ctx) {
        
        return track.send(200, doTemplate(ctx.getRes('content.news')));
    }
})

```

В каждый узел при его выполнении передается ```track``` и ```ctx```. Трэк создается на каждый запрос и аггрегирует возможности ```request``` и ```response```. Контекст - это контекст вызова узла, в нем содержатся результаты зависимостей узла.

Результатом разрешения узла является возвращенное из него значение или брошенное исключение. Если преполагается асинхронное выполнение узла, то можно возвратить ```promise```. Узел считается разрешенным когда будет разрещен встроенный в контекст ```promise```, который автоматически разрешается возвращенным из узла значением.
