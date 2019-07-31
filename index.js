const Starling = require('starling-developer-sdk');
const MongoClient = require('mongodb').MongoClient;
const util = require('util');
const mapLimit = require('async/mapLimit');

const config = require('./config.json');
const RangeInMonths = require('./RangeInMonths');

// Do everything in an async function so we can use await
async function StarlingToMongo() {
    try {
        // Promisify callback function so we can use await
        const asyncMongoClientConnect = util.promisify(MongoClient.connect);

        // Connect to the database
        var mongo_url=`mongodb://${config.mongo.server_ip}:${config.mongo.server_port}`;
        var dbConnection = await asyncMongoClientConnect(mongo_url);
        var db = dbConnection.db(config.mongo.database_name);

        // Drop and recreate the destination collection
        db.dropCollection(config.mongo.transaction_collection);
        db.createCollection(config.mongo.transaction_collection);

        // Get a reference to the destination connection
        var transaction_collection = db.collection(config.mongo.transaction_collection);
        // And make an async version of its insert method
        const asyncInsertOne = util.promisify(transaction_collection.insertOne.bind(transaction_collection));

        // Connect to starling using personal access token
        const client = new Starling({
            accessToken: config.starling.personal_token
        });

        //Retrieve basic account information
        var accountDetails = await client.getAccount();
        if(accountDetails.err) throw new Error(`Get account details failed with error: ${accountDetails.err}`);
        var accountInfo = {
            "accountNumber": accountDetails.data.accountNumber,
            "createdAt":     new Date(accountDetails.data.createdAt)
        };

        // Sequentially download transaction histories
        // Note this is synchronous to be kind to their api
        var today = new Date(); //today

        // For months between account creation date and today
        for(const period of new RangeInMonths(accountInfo.createdAt, today)) {

            //Get transactions for this period
            try{
                var start = period.start.format('YYYY-MM-DD');
                var end = period.end.format('YYYY-MM-DD');
                var response = await client.getTransactions(
                        undefined,
                        start,
                        end
                    );
                if(response.err) throw new Error(`Getting transaction summaries for period ${start} - ${end} failed with error: ${response.err}`);
            } catch (err) { throw new Error(`Getting transaction summaries for period ${start} - ${end} failed with error: ${err}`); }
            // From the response, select the transactions list
            var transactions = response.data._embedded.transactions;

            mapLimit(transactions, 5, async (transactionSummary) => {
                // Get all details for that transaction
                try{
                    // TODO: This is failing on a different transaction each time, try rate limiting
                    var transactionDetails = await client.getTransaction(
                            undefined,
                            transactionSummary.id,
                            transactionSummary.source
                        )
                    if(transactionDetails.err) throw new Error(`Getting transaction detail for transaction ${transactionSummary.id} failed with error: ${transactionDetails.err}`);
                } catch (err) { throw new Error(`Getting transaction detail for transaction ${transactionSummary.id} failed with error: ${err}`); }

                //Write transactions to the database
                var mongoWriteReport = await asyncInsertOne(transactionDetails.data);
                if(transactionDetails.err) throw new Error(`Writing transaction to mongo failed with error: ${transactionDetails.err}`);
            });
        }
    }
    catch (err) { throw new Error(`Unhandled exception in StarlingToMongo: ${err}`); }
}
StarlingToMongo()
