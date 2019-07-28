const config = require('./config.json')
const Starling = require('starling-developer-sdk');
const client = new Starling({
    accessToken: config.personal_token
});

client.getTransactions(undefined, '2019-06-01', '2019-07-01')
    .then(({data}) => {
        console.log(JSON.stringify(data))
    })
    .catch(err => console.log(err));
