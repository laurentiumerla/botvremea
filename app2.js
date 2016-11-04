var restify = require('restify');
var builder = require('botbuilder');

//Custom Data Service Handler - replace with your own.
var services = require('./services.handler.js');

//Machine Learning Service Handler - replace with your own.
var watsonServices = require('./watson.services.js');

const PORT = process.env.PORT || 3978;


// Create bot and add dialogs - you will need to setup your bot to get these.
var bot = new builder.BotConnectorBot({ appId: '9b8f2b54-aff5-4e71-873f-160fd3906c6d', appSecret: 'BF6Tf3b7vWCgH5JufCOWiny' });


//Dialogs definition:
//This is where you create the script for the dialog, the script can be static or dynamic.
bot.add('/', [function(session)
        {
            //Opening Dialog to greet the user
            builder.Prompts.text(session,"Thank you for getting in touch today! If you are an existing customer type in your account number, if not then just type 'no'?");
        },
        function(session, results, next)
        {
            //Decision point - is the user a customer?
            if (results.response) {
                var result = results.response;
                if (result=='no') {
                    //Not a customer - the check can be made more intelligent i.e. by using similarity measures
                    console.log("Not a customer");
                    session.dialogData.isCustomer = false;
                    builder.Prompts.text(session,"No worries, how can I help you today?");
                }else
                {
                  //User is a customer - parse the customer id and retrieve name for a customized greeting
                  //**Hard coded service** - default customer id to use: 1234
                  console.log("Customer Id:",result);
                  session.dialogData.customerId = result;
                  
                  builder.Prompts.text(session,"How can I help you today "+services.crm_getAccount(result));
                  
                }
            }
            else
            {
               console.error("No response.");
               next();
               
            }
        },
        function(session,results,next)
        {
        
         
         if (session.dialogData.isCustomer===false) {
           //Use Watson Sentiment Analysis to extract the user sentiment in the response - can replace with your preferred provider/custom implementation
           watsonServices.tone_analyzer_service.tone({text:results.response}, function(err,tone)
                                                             {
                                                               var localSession = session;
                                                               var text = "I am connecting you to an agent who will be able to help you further.";
                                                               if (err) {
                                                                console.error(err);
                                                                session.send(text);
                                                               }

                                                               var tones = tone.document_tone.tone_categories[0].tones;
                                                               //Got the response back from Watson API
                                                               console.log(tones);
                                                               var maxScore = 0;                                            
                                                               var activeTone = "";
                                                               //Calculate max score for sentiment
                                                               for(i=0;i<tones.length;i++)
                                                               {
                                                              
                                                                  if (tones[i].score>= maxScore) {
                                                                    activeTone = tones[i].tone_id;
                                                                    maxScore = tones[i].score;
                                                                  }
                                                               }
                                                               //Display the calculated max score for sentiment.
                                                               console.log(maxScore,activeTone);
                                                               
                                                               //Dependening on tone with maximum score - provide the response
                                                               if (activeTone === 'anger' || activeTone === 'disgust') {
                                                                text = "I understand you are upset, please let me try and help you.";
                                                               }
                                                               else if (activeTone === 'sadness' || activeTone === 'fear') {
                                                                text = "I am sorry to hear that, I will do my best to help you today.";
                                                               }
                                                               else if (activeTone === 'joy') {
                                                                text = "Great, looking forward to helping you out today!";
                                                               }
                                                               console.log(text);
                                                               localSession.send(text);
                                                               //End the dialog - End of Demo
                                                               session.endDialog();
                                                             });
            
         }
         else
         {
            session.send("Let me see you need help with... "+results.response);
            //End the dialog - End of Demo
            session.endDialog();
         }
         
         
        }]);



// Setup Restify Server
var server = restify.createServer();

//Query Parser
server.use(restify.queryParser());

//Bot Endpoint
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());


//Get the Bot Endpoint to start listening for Dialog requests
server.listen(PORT, function () {
    console.log('%s listening to %s', server.name, server.url); 
});



