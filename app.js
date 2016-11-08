var restify = require('restify');
var builder = require('botbuilder');
// var http = require('http');
var request = require("request");
var rp = require('request-promise');

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
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', intents);

// bot.dialog('/', new builder.IntentDialog({ recognizers: [recognizer] })
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
// .onBegin(function(session) {
//     console.log('Session: ', session);
//     session.beginDialog('/ensureProfile', session.userData.profile);
// })
intents
    .matches(/^Buna/i, function(session) {
        session.send('Buna %(name)s!', session.userData.profile);
        session.send('Cu ce te pot ajuta?');
    })
    // .matches(/^vremea/i, [
    //     function(session, args) {
    //         session.beginDialog('/getWeather', session.userData.profile);
    //     },
    //     function(session, results) {
    //         session.userData.profile = results.response;
    //         session.send('Vremea este %(weathertext)s in %(location)s!', session.userData.profile);
    //     }
    // ])
    .matches('GetWeather', [
        function(session, args) {
            console.log(args);
            var task = builder.EntityRecognizer.findEntity(args.entities, 'Location');
            // console.log(session);
            // session.userData.profile.location = task.entity;
            // session.beginDialog('/getWeather', session.userData.profile);
            // session.beginDialog('/getWeather', task.entity);
            var weather = azrGetWeather(task.entity);
            if (weather){
                session.send('Vremea este %(Weathertext)s!', weather);
            }
        }
        // },
        // function(session, results) {
        //     session.userData.profile = results.response;
        //     session.send('Vremea este %(weathertext)s in %(location)s!', session.userData.profile);
        // }
    ])
    .onDefault(function(session, args) {
        session.send("Nu inteleg!");
    })
// );

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

var azrGetWeather = function(__location) {
    if (__location) {
        awxCityLookUp(__location)
            .then(function(data) {
                console.log(data);
                if (data.length == 1) {
                    awxGetCurrentConditions(data[0].Key)
                        .then(function(data) {
                            console.log(data) // Print the json response
                            return data[0].WeatherText;
                        })
                        .catch(function(error) {
                            console.log("Accuweather call error:", error);
                            return null;
                        });
                }
                else if (data.length == 0) {
                    return null;
                }
                else {
                    //Multiple locations found
                    builder.Prompts.choice(session, "Care dintre locatii te intereseaza?", data);
                }


            })
            .catch(function(error) {
                console.log("Accuweather call error:");
                return null;
            });
    }
    else {
        return null;
    }
}

bot.dialog('/getWeather', [
    function(session, args) {
        session.dialogData.profile = args || {};
        // console.log('getWeather for ', session.dialogData.profile.location);
        if (session.dialogData.profile.location) {
            awxCityLookUp(session.dialogData.profile.location)
                .then(function(data) {
                    console.log(data);
                    if (data.length == 1) {
                        awxGetCurrentConditions(data[0].Key)
                            .then(function(data) {
                                console.log(data) // Print the json response
                                session.dialogData.profile.weathertext = data[0].WeatherText;
                                session.endDialogWithResult({ response: session.dialogData.profile });
                            })
                            .catch(function(error) {
                                console.log("Accuweather call error:", error);
                                session.endDialogWithResult({ response: session.dialogData.profile });
                            });
                    }
                    else if (data.length == 0) {
                        session.dialogData.profile.weathertext = undefined;
                        session.endDialogWithResult({ response: session.dialogData.profile });
                    }
                    else {
                        //Multiple locations found
                        builder.Prompts.choice(session, "Care dintre locatii te intereseaza?", data);
                        session.endDialogWithResult({ response: session.dialogData.profile });
                    }


                })
                .catch(function(error) {
                    console.log("Accuweather call error:");
                    session.endDialogWithResult({ response: session.dialogData.profile });
                });


            // var locationUrl = "http://apidev.accuweather.com/locations/v1/search?q=" +
            //     session.dialogData.profile.location +
            //     "&apikey=" + ACCUWEATHER_API_KEY;
            // // Gets current location key.
            // request({
            //     url: locationUrl,
            //     json: true
            // }, function(error, response, body) {
            //     if (!error && response.statusCode === 200) {
            //         console.log(body) // Print the json response
            //         var msg, locationKey = null;
            //         locationKey = body[0].Key;
            //         console.log("One location found: <b>" + body[0].LocalizedName + "</b>. Key: " + locationKey)

            //         awxGetCurrentConditions(locationKey)
            //             .then(function(body) {
            //                 console.log(body) // Print the json response
            //                 session.dialogData.profile.weathertext = body[0].WeatherText;
            //                 session.endDialogWithResult({ response: session.dialogData.profile });
            //             })
            //             .catch(function(error) {
            //                 console.log("Accuweather call error:", error);
            //                 session.endDialogWithResult({ response: session.dialogData.profile });
            //             });


            //     } else {
            //         console.log("Accuweather call error:");
            //         session.endDialogWithResult({ response: session.dialogData.profile });
            //     }
            // })
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




var awxGetCurrentConditions = function(__locationKey) {
    _uri = "http://apidev.accuweather.com/currentconditions/v1/" +
        __locationKey + ".json?language=" + ACCUWEATHER_LANGUAGE + "&apikey=" + ACCUWEATHER_API_KEY;

    // Gets current conditions for the location.
    return rp({ uri: _uri, json: true });
}

var awxCityLookUp = function(__freeText) {
    var _uri = "http://apidev.accuweather.com/locations/v1/search?q=" +
        __freeText + "&apikey=" + ACCUWEATHER_API_KEY;
    // test cu Plesoiu
    // Gets current conditions for the location.
    return rp({ uri: _uri, json: true });
}