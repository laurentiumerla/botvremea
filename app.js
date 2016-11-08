var restify = require('restify');
var builder = require('botbuilder');
// var http = require('http');
var request = require("request")

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
var recognizer = new builder.LuisRecognizer('https://api.projectoxford.ai/luis/v1/application?id=cf83bf53-8b33-4d24-8e19-133749db68da&subscription-key=293077c0e3be4f6390b9e3870637905d');
// var intents = new builder.IntentDialog({ recognizers: [recognizer] });
// bot.dialog('/', intents);



bot.dialog('/', new builder.IntentDialog({ recognizers: [recognizer] })
    // .onBegin([
    //     function(session) {
    //         console.log('Session: ', session);
    //         session.beginDialog('/ensureProfile', session.userData.profile);
    //     },
    //     function(session, results) {
    //         session.userData.profile = results.response;
    //         session.send('Buna %(name)s! Imi place %(location)s!', session.userData.profile);
    //     }    
    // ])
    .matches(/^Buna/i, function(session) {
        session.send('Buna %(name)s!', session.userData.profile);
        session.send('Cu ce te pot ajuta?');
    })
    .matches(/^vremea/i, [
        function(session, args) {
            console.log("Args: ",args);
            var task = builder.EntityRecognizer.findEntity(args.entities, 'Location');
            console.log(task);
            session.beginDialog('/getWeather', session.userData.profile);
        },
        function(session, results) {
            session.userData.profile = results.response;
            session.send('Vremea este %(weathertext)s in %(location)s!', session.userData.profile);
        }
    ])
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


var ACCUWEATHER_API_KEY = "hoArfRosT1215";
var ACCUWEATHER_LANGUAGE = "ro";

bot.dialog('/getWeather', [
    function(session, args) {
        session.dialogData.profile = args || {};
        console.log('getWeather for ', session.dialogData.profile.location);
        if (session.dialogData.profile.location) {
            var locationUrl = "http://apidev.accuweather.com/locations/v1/search?q=" +
                session.dialogData.profile.location +
                "&apikey=" + ACCUWEATHER_API_KEY;

            request({
                url: locationUrl,
                json: true
            }, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log(body) // Print the json response
                    var msg, locationKey = null;
                    locationKey = body[0].Key;
                    console.log("One location found: <b>" + body[0].LocalizedName + "</b>. Key: " + locationKey)

                    currentConditionsUrl = "http://apidev.accuweather.com/currentconditions/v1/" +
                        locationKey + ".json?language=" + ACCUWEATHER_LANGUAGE + "&apikey=" + ACCUWEATHER_API_KEY;
                    request({
                        url: currentConditionsUrl,
                        json: true
                    }, function(error, response, body) {
                        if (!error && response.statusCode === 200) {
                            console.log(body) // Print the json response
                            session.dialogData.profile.weathertext = body[0].WeatherText;
                            session.endDialogWithResult({ response: session.dialogData.profile });
                        } else {
                            console.log("Accuweather call error:");
                            session.endDialogWithResult({ response: session.dialogData.profile });
                        }
                    })
                } else {
                    console.log("Accuweather call error:");
                    session.endDialogWithResult({ response: session.dialogData.profile });
                }
            })
        } else {
            session.beginDialog('/ensureProfile', session.dialogData.profile);
            session.endDialogWithResult({ response: session.dialogData.profile });
        }

    }
]);

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