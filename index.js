/* eslint-disable max-len */
const MongoClient = require('mongodb').MongoClient;
const Starling = require('starling-developer-sdk');
const mapLimit = require('async/mapLimit');
const moment = require('moment');
const util = require('util');

const RangeInMonths = require('./RangeInMonths');
const config = require('./config.json');

/**
 * Retrieves detailed transactions from Starling and loads them into MongoDB,
 * for the account associated with the personalAuth specified in config.json,
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

    // Drop destination collection
    try { // (or fail silently if it doesn't exist yet)
      db.dropCollection(config.mongo.transaction_collection);
    } catch (err) {}
    // And recreate the destination collection
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

    // For each month between account creation date and today, fetch all transactions:
    for (const period of new RangeInMonths(accountInfo.createdAt, today)) {
      // Get transactions for this period
      let transactions = [];
      try {
        // Log progress
        const percentComplete = Math.ceil((monthCounter / totalMonths) * 100);
        console.log(`Progress: ${percentComplete}% - Loading month ${monthCounter}`);
        monthCounter += 1;

        // Fetch transactions for the period from Starling
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

      // For each transaction this month, get transaction details
      mapLimit(transactions, 1, async (transactionSummary) => {
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

        try {
          // If there is a merchant ID fetch complete details for the merchant
          if (transactionDetails.merchantId) {
            const response = await client.getMerchant(
              undefined,
              transactionDetails.merchantId
            );
            if (response.err) throw new Error(`Getting transaction detail for transaction ${transactionSummary.id} failed with error: ${response.err}`);

            // Add the retrieved merchant details to the transaction\'s data
            if(response.status === 200) {
              transactionDetails.merchantDetails = response.data
            }
          }
        } catch (err) {
          console.error(`Getting details of merchant ${transactionDetails.merchantId} failed with error:  ${err}`);
        }

        try {
          // If there is a merchantID and a merchantLocationID fetch complete details for the location
          if (transactionDetails.merchantLocationId) {
            const response = await client.getMerchantLocation(
              undefined,
              transactionDetails.merchantId,
              transactionDetails.merchantLocationId
            );
            if (response.err) throw new Error(`Getting transaction detail for transaction ${transactionSummary.id} failed with error: ${response.err}`);

            // Add the retrieved location details to the transaction\'s data
            if(response.status === 200) {
              transactionDetails.merchantLocationDetails = response.data
            }
          }
        } catch (err) {
          console.error(`Getting details of merchant ${transactionDetails.merchantLocationId} failed with error:  ${err}`);
        }

        // Write a transaction record to the database
        const mongoWriteReport = await asyncInsertOne(transactionDetails);
        if (mongoWriteReport.err) throw new Error(`Writing transaction to mongo failed with error: ${mongoWriteReport.err}`);
      });
    }
    

    // Finally close DB connection
    console.log('Starling -> Mongo load complete');
    dbConnection.close();
  } catch (err) {
    throw new Error(`Unhandled exception in StarlingToMongo: ${err}`);
  }
};

// Run starlingToMongo main function then exit
Promise.all([starlingToMongo()])
    .then(process.exit);
