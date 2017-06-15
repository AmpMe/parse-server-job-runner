const http = require('http');

const express = require('express');
const { MongoClient } = require('mongodb');
const { ParseServer } = require('parse-server');
const Parse  = require('parse/node');

let app, api, httpServer;
const port = 30001;
const serverURL = `http://localhost:${port}/1`;
const databaseURI = 'mongodb://localhost:27017/parse-test';

function getDB() {
  return new Promise((resolve, reject) => {
    MongoClient.connect(databaseURI, (err, db) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

function cleanupDB(done) {
  function complete(err) {
    if (!done) {
      return;
    }
    if (err) {
      done.fail(err);
    } else {
      done();
    }
  }
  return getDB()
    .then((db) => {
      return new Promise((resolve, reject) => {
        db.dropDatabase((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    })
    .then(complete)
    .catch(complete);
}

function startParseServer(done) {
  cleanupDB()
    .then(() => {
      app = express();
      api = new ParseServer({
        serverURL,
        databaseURI,
        appId: 'test',
        masterKey: 'test'
      });
      app.use('/1', api);

      httpServer = http.createServer(app);
      return new Promise((resolve) => httpServer.listen(port, resolve));
    })
    .then(() => {
      Parse.initialize('test', 'test', 'test');
      Parse.serverURL = serverURL;
    })
    .then(done)
    .catch(done.fail)
}

function stopParseServer() {
  httpServer.close();
}

module.exports = {
  startParseServer,
  stopParseServer,
  getDB,
  cleanupDB
}
