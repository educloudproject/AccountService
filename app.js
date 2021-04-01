const express = require('express')
const app = express()
const port = 3005

const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
app.use(bodyParser.json())

const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const url = 'mongodb://localhost:27017';
const dbName = 'disk-lovers-account-service';
const client = new MongoClient(url, { useUnifiedTopology: true });
let db;
let collection;

client.connect(function() {
    try {
        db = client.db(dbName);
        collection = db.collection('accounts');
        console.log('Connected successfully to database server');
    } catch (error) {
        console.log('Error: Could not connect to database server');
    }
});

app.listen(port, () => {
    console.log(`Account Service listening at http://localhost:${port}`)
})

app.post('/create-account', async (req, res) => {
    let username = req.body.username;
    let pword = req.body.password;
    let email = req.body.email;

    //check if all required data was sent
    if (username === undefined || pword === undefined || email === undefined){
        return res.status(400).send('You must supply username, password and email\n')
    }

    let exists = await checkUsernameExists(username)
    if (exists){
        return res.status(400).send('Username already exists\n');
    }

    let account = {
        username: username,
        password: pword, 
        email: email, 
        loggedIn: true}

    let resultMessage = 'Created Account';
    let statusCode = 201;

    try {
        await collection.insertOne(account);
    } catch (error) {
        resultMessage = 'Error creating Account';
        statusCode = 500;
        console.log('An error occurred while creating account', error);
    }
    return res.status(statusCode).send(resultMessage);

})

app.get('/accounts', async (req, res)  => {
    let result;
    let statusCode = 200;
    try {
        result = await collection.find({}).toArray();
        //console.debug(result);
    } catch (error) {
        result = getErrorObject('Error fetching Orders List');
        statusCode = 500;
        console.log('An error occurred while fetching the list of orders', error);
    }
    return res.status(statusCode).json(result);
});


app.post('/login', async (req, res) => {
    let username = req.body.username;
    let pword = req.body.password;

    //check if all required data was sent
    if (username === undefined || pword === undefined){
        return res.status(400).send("You must supply username, password and email")
    }

    let exists = await checkUsernameExists(username)
    if (!exists){
        return res.status(400).send("Username does not exists");
    }

    //let correctPword = await checkPassword(username, pword);
    let result = await collection.findOne({'username': username});
    if (result.password === pword){
        await collection.updateOne(
            {'username': username, 'password':pword},
            {$set: {'loggedIn': true}});
    }else{
        return res.status(400).send("Password provided is incorrect");
    }

    return res.status(200).send("Logged in ");

})

app.post('/change-password', async (req, res) => {

    let username = req.body.username;
    let currentpword = req.body.currentpassword;
    let newpword = req.body.newpassword;

    //check if all required data was sent
    if (username === undefined || currentpword === undefined || newpword == undefined){
        return res.status(400).send("You must supply username, currentpassword and newpassword")
    }

    //check if user exists
    let exists = await checkUsernameExists(username)
    if (!exists){
        return res.status(400).send("Username does not exists");
    }

    let result = await collection.findOne({'username': username});

    //check if user is logged in
    if (result.loggedIn !== true) {
        return res.status(400).send("You are not logged in");
    }

    //check if correct password
    if (result.password !== currentpword){
        return res.status(400).send("Password provided is incorrect");
    }

    //change password
    await collection.updateOne(
        {'username': username, 'password':currentpword},
        {$set: {'password': newpword}});

    res.status(200).send("Password changed ");

})

app.post('/logout', function (req, res) {

    let username = req.body.username;
    accounts[username].loggedIn = false;
    res.status(200).send("Logged out ");

})

async function checkUsernameExists(username){
    result = await collection.findOne({'username': username});
    return result !== null
}

async function checkPassword(username, pword){
    result = await collection.findOne({'username': username});
    if (result.password === pword){
        await collection.updateOne(
            {'username': username, 'password':pword},
            {$set: {'loggedIn': true}});
    }
    return result.password === pword
}
