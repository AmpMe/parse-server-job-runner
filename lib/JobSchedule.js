/*
How to determine if a job should be run at a current date?
1. job.dayOfWeek contains "1" at the current day index (0-6)
2. job.startAfter is less than the current date
3. job.timeOfDay is less than the current time of day (the job's start time every day)
4. job.lastRun + job.repeatMinutes >= now (if repeat minutes is set, rounded to the minute)
 */
const debug = require('debug')('parse-server-job-runner:JobSchedule');
const Parse = require('parse/node');
const request = require('request-promise');

const {
  filters
} = require('./utils');

class JobSchedule extends Parse.Object {
  constructor() {
    super("_JobSchedule");
  }
  get jobName() {
    return this.get('jobName');
  }
  get description() {
    return this.get('description');
  }
  // @returns params for the job
  get params() {
    return this.get('params');
  }
  // @returns stringified date ex (2016-02-29T17:05:39.000Z)
  get startAfter() {
    return this.get('startAfter');
  }
  // returns an array for the days of weeks
  get daysOfWeek() {
    return this.get('daysOfWeek');
  }
  get timeOfDay() {
    return this.get('timeOfDay');
  }
  get lastRun() {
    return this.get('lastRun');
  }
  get repeatMinutes() {
    return this.get('repeatMinutes');
  }

  run(date) {
    debug(`running ${this.jobName}`)
    const options = {};
    options.headers = {
      'X-Parse-Application-Id': Parse.applicationId,
      'X-Parse-Master-Key': Parse.masterKey,
      'Content-Type': 'application/json'
    }
    options.url = Parse.serverURL + '/jobs/' + this.jobName;
    options.body = this.params;
    options.method = 'POST';
    return request(options)
      .then(() => {
        debug(`successfully ran ${this.jobName}!`);
        return this.save({
          lastRun: Math.round(date.getTime() / 1000)
        }, {useMasterKey: true});
      })
      .catch(res => {
        debug(`error running ${this.jobName}`, res.error);
        throw res;
      });
  }

  static get() {
    const query = new Parse.Query("_JobSchedule");
    return query.find({useMasterKey: true});
  }

  static getJobsToRun(date) {
    return JobSchedule.get().then((jobs) => {
      debug(`found ${jobs.length} jobs scheduled`);
      jobs = jobs.filter(filters.all(date));
      debug(`running ${jobs.length} jobs...`);
      return jobs;
    })
  }

  static run() {
    debug('running...');
    const date = new Date();
    return JobSchedule
      .getJobsToRun(date)
      .then((jobs) => {
        return Promise.all(jobs.map(job => job.run(date)));
      })
      .catch(debug.error)
  }
}

Parse.Object.registerSubclass('_JobSchedule', JobSchedule);
module.exports = { JobSchedule };
