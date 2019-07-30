const Starling = require('starling-developer-sdk');
const MongoClient = require('mongodb').MongoClient;
const util = require('util');

const config = require('./config.json')
const RangeInMonths = require('./RangeInMonths')

// Connect to starling using personal access token
const client = new Starling({
    accessToken: config.personal_token
});

//console.log(typeof(accountPromise.data.accountNumber))

// Async function to 
async function StarlingToMongo() {

    var collection = null
    try {

        // Mongo connection parameters
        var MONGO_PUBLISH_IP='127.0.0.1'
        var MONGO_PUBLISH_PORT='27017'
        var DB_NAME='starling'
        var MONGO_URL=`mongodb://${MONGO_PUBLISH_IP}:${MONGO_PUBLISH_PORT}`
        var COL_TRANSACTIONS = 'transctions'
        
        // Promisify callback function so we can use await
        const asyncMongoClientConnect = util.promisify(MongoClient.connect)
        
        // Connect to the database
        var dbConnection = await asyncMongoClientConnect(MONGO_URL)
        var db = dbConnection.db(DB_NAME)
        //db.dropCollection(COL_TRANSACTIONS)
        db.createCollection(COL_TRANSACTIONS)
        collection = db.collection('COL_TRANSACTIONS')
    }
    catch (err) { throw new Error(err)}
    const asyncInsertMany = util.promisify(collection.insertMany.bind(collection))
    
    var accountDetails = await client.getAccount()
    
    var accountInfo = {
        "accountNumber": accountDetails.data.accountNumber,
        "createdAt":     new Date(accountDetails.data.createdAt)
    }

    // Sequentially download transaction histories
    // Note this is synchronous to be kind to their api
    var today = new Date() //today
    // For months between account creation date and today
    for(const period of new RangeInMonths(accountInfo.createdAt, today)) {
        //Get transactions for this period
        var response = await client.getTransactions(
                undefined, 
                period.start.format('YYYY-MM-DD'),
                period.end.format('YYYY-MM-DD'),
            )
        if(response.err) throw new Error(response.err)
        var transactions = response.data._embedded.transactions
        try {
        var returned = await asyncInsertMany(transactions)
        if(returned.err) throw new Error(returned.err)
        }
        catch (err) { throw new Error(err)}
    }


    //console.log(JSON.stringify(accountInformation, null, 2))
}
StarlingToMongo()

/*
client.getAccount()
/*
Available data (synthetic sample)
  "id": "f13d1136-0c92-3348-3ba2-8f6aa4fb9ffa",
  "name": "a23ca446-2a2a-34ca-e31b-cc1f4a283c0 GBP",
  "number": "71231234",
  "accountNumber": "71231234",
  "sortCode": "123456",
  "currency": "GBP",
  "iban": "GB12SRLG10123456123456",
  "bic": "SRAAGB4T",
  "createdAt": "2015-06-01T12:00:00.000Z"

*//*
.then(({data}) => {
    //console.log(JSON.stringify(data, null, 2))
    return accountInformation = {
        "accountNumber": data.accountNumber,
        "createdAt":     data.createdAt
    }
})
.then(({accountInformation}) => {
    client.getTransactions(undefined, '2019-06-01', '2019-07-01')
    .then(({data}) => {
        console.log(JSON.stringify(data, null, 2))
    })
    .catch(err => console.log(err));
})
.then(({accountInformation}) => {

)
.catch(err => console.log(err));



/*
client.getTransactions(undefined, '2019-06-01', '2019-07-01')
    .then(({data}) => {
        console.log(JSON.stringify(data, null, 2))
    })
    .catch(err => console.log(err));

client.getTransaction(undefined, '2a94c52a-f463-4423-a8d7-9dbbe826a8b2', 'MASTER_CARD')
    .then(({data}) => {
        console.log(JSON.stringify(data, null, 2))
    })
    .catch(err => console.log(err));
*/