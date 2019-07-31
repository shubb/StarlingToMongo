# StarlingToMongo

Want to pull the transaction history of your personal Starling account into Mongo for analysis?

StarlingToMongo retrieves detailed transactions from Starling and loads them into MongoDB,
for the account associated with the personalAuth token specified in config.json,
and into the mongo database as specified in config.json

## Getting A Starling Personal Auth Token

Starling requires applications to be registered, and implement 0Auth. 
However, customers can enjoy full access to their own accounts using a personal token. 

Steps to generate the token:
1. [Go to Starling's developer getting started page](https://developer.starlingbank.com/get-started)
2. In the 'Register your application' section, create an account only
3. Go to the Personal Access section and use the buttons to:
4. Connect the developer account you just created to your bank account
5. Generate a Personal Access Token

## Creating A Destination MongoDB Instance

The destination database can be set in the config file. 
This section is not necessary if you already have a destination database set up. 

Steps to bring up a suitable database:
1. Install docker
2. Create a folder to keep the database data while the docker container is shut down ( e.g. ~/StarlingDB )
3. Run 
```bash
eval STARLING_DATA_FOLDER="~/StarlingDB"
mkdir -p $STARLING_DATA_FOLDER
docker run --name StarlingMongoDB -d -v /opt/mongodb:$STARLING_DATA_FOLDER -p 27017:27017 mongo
```
4. If the docker instance is shut down, running the above again will bring it back up complete with data. 

A good tool for looking at the data once it is loaded is [Studio 3T](https://studio3t.com/)

## Configuration

Destination database and Personal Auth Token must be set in the destination database before running. 

The configuration file has the following structure:
```JSON
{
    "starling": {
        "personal_token": "<Your auth token here>"
    },

    "mongo" : {
        "server_ip": "<IP Address of mongo host>",
        "server_port": "<Port number of the mongo database>",
        "database_name": "<Destination database name within mongo>",
        "transaction_collection": "<Destination collection within that database>"
    }
}
```

A configuration if using Docker as suggested would be:
(Fake personal_token, each customer must create their own)

```JSON
{
    "starling": {
        "personal_token": "abcdefghijklmonpqrstuvwxyz123456789abcdefghijklmonpqrstuvwxyz123"
    },

    "mongo" : {
        "server_ip": "127.0.0.1",
        "server_port": "27017",
        "database_name": "Starling",
        "transaction_collection": "Transactions"
    }
}
```
## Screenshots:

A transaction loaded into mongo:

![](http://imgur.com/mIMkwvwl.png)
