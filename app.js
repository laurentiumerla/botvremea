var restify = require('restify');
var builder = require('botbuilder');
var http = require('http');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
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

bot.dialog('/', new builder.IntentDialog()
    .onBegin([
        function(session) {
            console.log('Session: ', session);
            session.beginDialog('/ensureProfile', session.userData.profile);
        },
        function(session, results) {
            session.userData.profile = results.response;
            session.send('Buna %(name)s! Imi place %(location)s!', session.userData.profile);
        }
    ])
    .matches(/^Buna/i, function(session) {
        session.send('Buna %(name)s!', session.userData.profile);
    })
    .onDefault(function(session) {
        session.send("Nu inteleg!");
    })
);

// bot.dialog('/', [
//     function(session) {
//         session.beginDialog('/ensureProfile', session.userData.profile);
//     },
//     function(session, results) {
//         session.userData.profile = results.response;
//         session.send('Buna %(name)s! Imi place %(location)s!', session.userData.profile);
//     }
// ]);

bot.dialog('/ensureProfile', [
    function(session, args, next) {
        console.log("Arguments->", args);
        session.dialogData.profile = args || {};
        if (!session.dialogData.profile.name) {
            builder.Prompts.text(session, 'Buna! Cum te cheama?');
        } else {
            next();
        }
    },
    function(session, results, next) {
        if (results.response) {
            session.dialogData.profile.name = results.response;
        }
        if (!session.dialogData.profile.location) {
            builder.Prompts.text(session, 'In ce oras locuiesti?');
        } else {
            next();
        }
    },
    function(session, results) {

        if (results.response) {
            session.dialogData.profile.location = results.response;
        }
        session.endDialogWithResult({ response: session.dialogData.profile });
    }
]);