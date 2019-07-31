/* eslint-disable max-len */
const Starling = require('starling-developer-sdk');
const MongoClient = require('mongodb').MongoClient;
const util = require('util');
const mapLimit = require('async/mapLimit');
const moment = require('moment');

const config = require('./config.json');
const RangeInMonths = require('./RangeInMonths');

/**
 * Retrieves detailed transactions from Starling and loads them into MongoDB,
 * for the account assosiated with the personalAuth specified in config.json,
 * and into the mongo database as specified in config.json
 */
async function starlingToMongo() {
  try {
    // Promisify callback function so we can use await
    const asyncMongoClientConnect = util.promisify(MongoClient.connect);

    // Connect to the database
    const mongoUrl=`mongodb://${config.mongo.server_ip}:${config.mongo.server_port}`;
    const dbConnection = await asyncMongoClientConnect(mongoUrl);
    const db = dbConnection.db(config.mongo.database_name);

    // Drop and recreate the destination collection
    db.dropCollection(config.mongo.transaction_collection);
    db.createCollection(config.mongo.transaction_collection);

    // Get a reference to the destination connection
    const transactionCollection = db.collection(config.mongo.transaction_collection);
    // And make an async version of its insert method
    const asyncInsertOne = util.promisify(transactionCollection.insertOne.bind(transactionCollection));

    // Connect to starling using personal access token
    const client = new Starling({
      accessToken: config.starling.personal_token,
    });

    // Retrieve basic account information
    const accountDetails = await client.getAccount();
    if (accountDetails.err) throw new Error(`Get account details failed with error: ${accountDetails.err}`);
    const accountInfo = {
      'accountNumber': accountDetails.data.accountNumber,
      'createdAt': new Date(accountDetails.data.createdAt),
    };

    // Sequentially download transaction histories
    // Note this is synchronous to be kind to their api
    const today = new Date();

    const totalMonths = Math.ceil(moment(today).diff(moment(accountInfo.createdAt), 'months', true));
    let monthCounter = 0;

    // For months between account creation date and today
    for (const period of new RangeInMonths(accountInfo.createdAt, today)) {
      // Get transactions for this period
      let transactions = [];
      try {
        // Log progress
        const percentComplete = Math.ceil((monthCounter / totalMonths) * 100);
        monthCounter += 1;
        console.log(`Loading month ${monthCounter}, ${percentComplete}`);

        const start = period.start.format('YYYY-MM-DD');
        const end = period.end.format('YYYY-MM-DD');
        const response = await client.getTransactions(
            undefined,
            start,
            end
        );
        if (response.err) throw new Error(`Getting transaction summaries for period ${start} - ${end} failed with error: ${response.err}`);

        transactions = response.data._embedded.transactions;
      } catch (err) {
        throw new Error(`Getting transaction summaries for period ${start} - ${end} failed with error: ${err}`);
      }

      mapLimit(transactions, 5, async (transactionSummary) => {
        // Get all details for that transaction
        let transactionDetails = {};
        try {
          const response = await client.getTransaction(
              undefined,
              transactionSummary.id,
              transactionSummary.source
          );
          if (response.err) throw new Error(`Getting transaction detail for transaction ${transactionSummary.id} failed with error: ${response.err}`);

          transactionDetails = response.data;
        } catch (err) {
          throw new Error(`Getting transaction detail for transaction ${transactionSummary.id} failed with error: ${err}`);
        }

        // Write transactions to the database
        const mongoWriteReport = await asyncInsertOne(transactionDetails);
        if (mongoWriteReport.err) throw new Error(`Writing transaction to mongo failed with error: ${mongoWriteReport.err}`);
      });
    }
  } catch (err) {
    throw new Error(`Unhandled exception in StarlingToMongo: ${err}`);
  }
}
starlingToMongo();
