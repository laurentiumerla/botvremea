var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', [
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Buna %s!', session.userData.name);
        next();
    },

    function (session, args, next) {
        if (!session.userData.location) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },

]);

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Buna! Cum te cheama?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);


bot.dialog('/location', [
    function (session) {
        builder.Prompts.text(session, 'In ce oras locuiesti?');
    },
    function (session, results) {
        session.userData.location = results.response;
        session.endDialog();
    }
]);