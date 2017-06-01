/**
 * Created by sagar.gohil on 18-04-2017.
 */
var restify = require('restify');
var builder = require('botbuilder');
var dateFormat = require('dateformat');

const {Wit, log} = require('node-wit');

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
    appId: '24ac1657-cd00-4df0-9629-41a6fd555387',
    appPassword:'YxbQYBFgU01MiKJdLHgXm0R'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var Enum = require('enum');
var rootFlow = new Enum(['payment', 'issue', 'StartGreeting'],{ignoreCase:true});


/*
var recognizer = new builder.LuisRecognizer('https://eastus2.api.cognitive.microsoft.com/luis/v2.0/apps/e52f3664-4bf6-4ca4-8c47-70a64301a866?subscription-key=8a9e130238094022b9fd0f71e02df48b&timezoneOffset=0&verbose=true&q=');
bot.recognizer(recognizer);
*/

bot.on('conversationUpdate', function (message) {
    console.log("Called Conversation updated");
    if (message.membersAdded && message.membersAdded.length > 0) {
        var isSelf = false;
        var membersAdded = message.membersAdded
            .map(function (m) {
                isSelf = m.id === message.address.bot.id;
                return (isSelf ? message.address.bot.name : m.name) || '' + ' (Id: ' + m.id + ')';
            })
            .join(', ');
        if (!isSelf) {
            console.log("not self");
            bot.send(new builder.Message()
                .address(message.address)
                .text('Welcome ' + membersAdded + "! How can i help you?"));
            bot.beginDialog(message.address,'/');
        }
    }
});

Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + parseInt(days));
    return this;
};

// Root dialog for entry point in application
bot.dialog('/', [
    function (session,args, next) {

        // Changes suggested by rakhi for demo 04-05-2017
        builder.Prompts.choice(session, "Please select an option below", "Payment Status|Inventory Information|Issues",
            {
                listStyle: builder.ListStyle.button,
                maxRetries: 2,
                retryPrompt: 'Please Provide main menu option'
            });
        // End

/*        result = args || {};
        console.log("feasdda : " + JSON.stringify(result));
        if (result == undefined || result.response == undefined) {
            builder.Prompts.text(session, "Hi " + session.message.user.name + " How can i help you?");
        }
        else if (result.response == "NU") {
            builder.Prompts.text(session, "You can say : 'Payment status' or 'Pending Payment' or 'Inventory' or 'Issue'");
        }*/
    },
    function (session, results) {
        if (results.response == undefined) {
            session.endDialog();
            session.replaceDialog('/');
        }
        else {
            // Changes suggested by rakhi for demo 04-05-2017
            var data = {};
            data.response = results.response.entity;
            RootMenu(session, data);
            // End

            /*RootMenu(session,results);*/
        }
    },
    function (session,results) {
        console.log("root final : " + results.response);
        RootMenu(session, results);
    }
]);

function RootMenu(session,results) {

    /*if (results.response.toUpperCase().indexOf("PAYMENT") !== -1) {
     session.beginDialog('/payment',results.response);
     }*/

    const client = new Wit({accessToken: 'OMA6J3GMQV43OCFXKIA3QKP7BJQCFDBT'});
    client.message(results.response, {}).then((data) => {

        var intentData = data.entities.intent != undefined ? data.entities.intent[0] : {};

        if (rootFlow.payment.is(intentData.value)) {
            if (data.entities.PaymentType != undefined) {
                session.conversationData.paymentType = data.entities.PaymentType[0].value;
            }

            if (data.entities.InvoiceNo != undefined) {
                session.conversationData.invoiceNo = data.entities.InvoiceNo[0].value;
            }

            session.beginDialog('/payment', results.response);
        }

        else if (results.response.toUpperCase().indexOf("INVENTORY") !== -1) {
            session.beginDialog('/Inventory');
        }
        else if (results.response.toUpperCase().indexOf("ISSUE") !== -1) {
            session.beginDialog('/issues');
        }
        else if (results.response.toUpperCase().indexOf("CLEAR") !== -1) {
            session.beginDialog('/ClearData');
        }
        else if (results.response.toUpperCase().indexOf("NO") !== -1) {
            session.send("Ok then "+session.message.user.name +", Goodbye :)");
            session.endDialog();
        }
        else if (results.response.toUpperCase().indexOf("YES") !== -1) {
            session.beginDialog('/');
        } else {
            session.send("Not Understood.");
            session.beginDialog('/',{response :'NU'});
        }
    })
        .catch(console.error);
}

bot.dialog('/verification', [
    function (session) {
        builder.Prompts.text(session, 'Please Enter Your DUNS number');
    },
    function (session, results) {
        builder.Prompts.text(session,"An OTP has been sent to the registered email on file. Please Enter the OTP.");
    },
    function (session, results) {
        session.send("OTP Verified. Thank You");
        session.userData.isVerified = true;
        session.endDialog();
    }
    ]);

bot.dialog('/payment', [
    function (session,args,next) {
        var response = args || {};
        session.dialogData.rootResponse = response;
        if (!session.userData.isVerified) {
            session.beginDialog('/verification');
        }
        else
        {
            next();
        }
    },
    //changes suggested by rakhi for demo -> 04-05-2017
    function (session) {
        var response = session.dialogData.rootResponse;
        session.beginDialog('/pendingPayments');
    },

    /*function (session) {
     var response = session.dialogData.rootResponse;
        if(response.toUpperCase().indexOf("PENDING") != -1)
        {
            session.beginDialog('/pendingPayments');
        }
        else
        {
            session.beginDialog('/otherPayments');
        }
    },*/
    function (session,results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/otherPayments',[
    function (session) {
        builder.Prompts.choice(session, "Payments invoice list","5100000015|5100000041|5100000098|5100000124",
            {
                listStyle: builder.ListStyle.button,
                maxRetries: 2,
                retryPrompt: 'Please Provide invoice no'
            });
    },
    function (session,results) {
        if (results.response == undefined) {
              session.endDialog();
            session.replaceDialog('/');
        }
        else {
            var newDate = dateFormat("mediumDate");
            session.send("Following are the details of your invoice");
            session.send("Invoice No : " + results.response.entity + "\n\nStatus   : Payment Released \n\nClearing Date   : 3" + newDate + "\n\nTransaction No : TNX6532233");
            session.beginDialog('/ConversationEnd');
        }
    },
    function (session,results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/pendingPayments',[
    function (session,args,next) {
        if (session.conversationData.invoiceNo == undefined) {
            builder.Prompts.choice(session, "List of invoices pending payment : ", "5100000013|5100000023|5100000067|5100000110",
                {
                    listStyle: builder.ListStyle.button,
                    maxRetries: 2,
                    retryPrompt: 'Please Provide invoice no'
                });
        }
        else
            next();
    },
    function (session,results) {
        if (results.response == undefined) {
            session.endDialog();
            session.replaceDialog('/');
        }
        else {
            // call to checkReset function
            checkIfResetDialog(session, results);

            var resp = results.response.entity;
            var currentDate = new Date();
            // to add 4 days to current date
            currentDate.addDays(4);
            var newDate = dateFormat(currentDate, "mediumDate");

            var invoiceNo = results.response == undefined ? session.conversationData.invoiceNo : resp;

            session.send("Following are the details of your invoice");
            session.send("Invoice No : " + invoiceNo + "\n\nStatus   : Approved and Pending Payments \n\nClearing Date   : " + newDate);
            builder.Prompts.text(session, "Would you like to connect with a representative?");
        }
    },
    function (session,results) {
        if(results.response.toUpperCase().indexOf("YES") !== -1)
        {
            session.send("Mr. Kunal Gaikwad \n\nFinance Executive \n\nEmail : kunam.gaikwad@sapex.com \n\nOffice : 020-2521134");
        }
        session.beginDialog('/ConversationEnd');
    },
    function (session,results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/issues', [
    function (session,args,next) {
        if (!session.userData.isVerified) {
            session.beginDialog('/verification');
        } else {
            next();
        }
    },
    function (session,results) {
        builder.Prompts.text(session, 'Is this an existing issue or a new issue?');
    },
    function (session, results,next) {
        if (results.response.toUpperCase().indexOf("NEW") !== -1) {
            session.beginDialog('/newIssue');
        }
        else
        {
            session.beginDialog('/existingIssue');
        }
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/Inventory', [
    function (session,args,next) {
        if (!session.userData.isVerified) {
            session.beginDialog('/verification');
        } else {
            next();
        }
    },
    function (session,results) {
        builder.Prompts.choice(session, "The following products are supplied by you. Choose one to know more.", "Silicon Wafer 200 micron|Galvanized metal mesh 10*20|Polished Silicon Wafer 2 inches|Plain Weave screen 600 microns|Steel Cable wire 2 mm",
        {
            listStyle: builder.ListStyle.button,
            maxRetries: 2,
            retryPrompt: 'Please provide product supplied by you'
        });
    },
    function (session, results) {
        if (results.response == undefined) {
            session.endDialog();
            session.replaceDialog('/');
        }
        else {
            session.send("Following are the details of your product");
            session.send("Product : " + results.response.entity + "\n\nStock   : 120 Units \n\nWeekly rate of consumption   : 46 Units \n\nReorder Level : 50 ");
            session.beginDialog('/ConversationEnd');
        }
    },
    function (session,results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/newIssue', [
    function(session) {
        //session.send("OK! You have selected new issue, Please describe your issue in few words");
        builder.Prompts.text(session, 'OK! You have selected new issue.\n\nPlease describe your issue in a few words.');
    },
    function (session, results) {
        builder.Prompts.text(session, 'What is priority? (1-5)');
    },
    function (session, results) {
        session.send('Great! new issue created.Your issue key is 1234.');
        session.beginDialog('/ConversationEnd');
    },
    function (session,results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/existingIssue', [
    function (session) {
        builder.Prompts.choice(session, "Ok! Please select one of the following issues", "VI-123|VI-234|VI-346",
            {
                listStyle: builder.ListStyle.button,
                maxRetries: 2,
                retryPrompt: 'Please Provide issue no'
            });
    },
    function (session, results) {
        if (results.response == undefined) {
            session.endDialog();
            session.replaceDialog('/');
        }
        else {
            session.send("Following are the details of your issue");
            session.send("Ticket No : " + results.response.entity + "\n\nSummary   : Incorrect vendor contact details \n\nPriority   : 3");
            builder.Prompts.text(session, "would you like to escalate?");
        }
    },
    function (session, results,next) {
        if (results.response.toUpperCase().indexOf("YES") !== -1) {
            session.send("Ok! I have escalated the issue accordingly");
        }
        next();
    },
    function (session,results) {
        session.beginDialog('/ConversationEnd');
    },
    function (session,results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/ConversationEnd',[
    function (session) {
        session.conversationData  = {};
        builder.Prompts.text(session, 'I hope i have resolved your queries!\n\nIs there anything else i can help you with?');
    }
]);


function checkIfResetDialog(session,results) {
    if(results.response === undefined ||results.response.entity.toUpperCase().indexOf("RESET") !== -1) {
        session.endDialog();
        session.beginDialog('/');
    }
    console.log('fun called');
}

//check if reset/exit
bot.dialog('/Reset', [
function (session,response) {
    session.beginDialog('/');
}
]).triggerAction({
    matches:'/^(close|reset)/i'
});

// To Clear user Data cache
bot.dialog('/ClearData', [
    function (session) {
        session.userData.isVerified = false;
        session.beginDialog('/ConversationEnd');
    }
]);
