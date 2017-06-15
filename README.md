parse-server-job-runner
====

A standalone node.js based command line tool to run scheduled jobs.

# Installing

`npm install -g parse-server-job-runner`

# Running

```
PARSE_APPLICATION_ID=appId PARSE_MASTER_KEY=masterKey PARSE_SERVER_URL=http://my.parse-server.com/1 npm start
```

# Using Docker

```
docker build . 
docker run -e PARSE_APPLICATION_ID=appId PARSE_MASTER_KEY=masterKey PARSE_SERVER_URL=http://my.parse-server.com/1 <image-id>
```
