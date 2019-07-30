const config = require('./config.json')
const Starling = require('starling-developer-sdk');

const RangeInMonths = require('./RangeInMonths')

// Connect to starling using personal access token
const client = new Starling({
    accessToken: config.personal_token
});

//console.log(typeof(accountPromise.data.accountNumber))

// Async function to 
async function StarlingToMongo() {
    
    var accountDetails = await client.getAccount()
    
    var accountInfo = {
        "accountNumber": accountDetails.data.accountNumber,
        "createdAt":     new Date(accountDetails.data.createdAt)
    }

    // Sequentially download transaction histories
    // Note this is synchronous to be kind to their api
    var today = new Date() //today
    for(const period of new RangeInMonths(accountInfo.createdAt, today)) {
        console.log(period.end.calendar())
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