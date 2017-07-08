const {
  startParseServer,
  stopParseServer,
  cleanupDB
} = require('./parse-server-helper');
const { JobSchedule } = require('../lib/JobSchedule');
const { filters } = require('../lib/utils');
const Parse = require('parse/node');
/*

{
    "_id": "CyVApna1IH",
    "jobName": "partyJanitor",
    "description": "Abandoned parties cleanup",
    "params": "{}",
    "startAfter": "2016-02-29T17:05:39.000Z",
    "daysOfWeek": [
        "1",
        "1",
        "1",
        "1",
        "1",
        "1",
        "1"
    ],
    "timeOfDay": "00:00:28.417Z",
    "lastRun": 1460403900,
    "_updated_at": {
        "$date": "2016-03-27T00:21:35.875Z"
    },
    "repeatMinutes": 15
}
 */
function makeFixture(options) {
  options = Object.assign({}, {
    jobName: 'job',
    description: 'A job that runs!',
    params: "{}",
    startAfter: new Date().toISOString(),
    daysOfWeek: ["1", "1", "1", "1", "1", "1", "1"],
    timeOfDay: "00:00:00.000Z",
    lastRun: undefined,
    repeatMinutes: 10
  }, options);
  return new JobSchedule().save(options, {useMasterKey: true});
}

describe('JobSchedule', () => {
  beforeAll(startParseServer);
  beforeEach(cleanupDB);
  afterAll(stopParseServer);

  it('should find all jobs', (done) => {
    makeFixture()
      .then(() => {
        return JobSchedule.get();
      }).then((results) => {
        expect(results.length).toBe(1);
        expect(results[0].jobName).toBe('job');
      })
      .then(done)
      .catch(done.fail);
  });

  it('should filter jobs that are after time of day', () => {
    const jobs = [
      {
        jobName: 'job1',
        timeOfDay: "12:00:00.000Z" // noon
      },
      {
        jobName: 'job2',
        timeOfDay: "22:00:00.000Z"
      },
      {
        jobName: 'job3',
        timeOfDay: "00:00:00.000Z"
      }
    ]
    const midnight = jobs.filter(filters.timeOfDay(new Date("2017-01-01 00:00:00Z")));
    const morning = jobs.filter(filters.timeOfDay(new Date("2017-01-01 09:00:00Z")));
    const noon = jobs.filter(filters.timeOfDay(new Date("2017-01-01 12:00:00Z")));
    const lateNight = jobs.filter(filters.timeOfDay(new Date("2017-01-01 23:59:59Z")));

    expect(midnight.length).toBe(1);
    expect(midnight[0].jobName).toBe('job3');
    expect(morning.length).toBe(1);
    expect(morning[0].jobName).toBe('job3');
    expect(noon.length).toBe(2);
    expect(noon[0].jobName).toBe('job1');
    expect(noon[1].jobName).toBe('job3');
    expect(lateNight.length).toBe(3);
    expect(lateNight[0].jobName).toBe('job1');
    expect(lateNight[1].jobName).toBe('job2');
    expect(lateNight[2].jobName).toBe('job3');
  });

  it('should let run a job that never ran', () => {
    const date = new Date("2017-01-01 00:00:00Z")
    const jobs = [
      {
        jobName: 'job1',
        timeOfDay: "00:00:00.000Z",
        startAfter: "2016-01-01 00:00:00Z",
        daysOfWeek: ["1","1","1","1","1","1","1"]
      }
    ].filter(filters.all(date));
    expect(jobs.length).toBe(1);
  });

  it('should not run a job that just ran', () => {
    const date = new Date("2017-01-01 00:00:01Z")
    const jobs = [
      {
        jobName: 'job1',
        timeOfDay: "00:00:00.000Z",
        startAfter: "2016-01-01 00:00:00Z",
        daysOfWeek: ["1","1","1","1","1","1","1"],
        lastRun: Math.round(date.getTime() / 1000) - 10, // last run is in secs.
      }
    ].filter(filters.all(date));
    expect(jobs.length).toBe(0);
  });

  it('should run the job if repeats', () => {
    const date = new Date("2017-01-01 00:00:01Z")
    const jobs = [
      {
        jobName: 'job1',
        timeOfDay: "00:00:00.000Z",
        startAfter: "2016-01-01 00:00:00Z",
        daysOfWeek: ["1","1","1","1","1","1","1"],
        repeatMinutes: 10, // every 10 minutes
        lastRun: Math.round(date.getTime() / 1000) - 10 * 60, // last run is in secs.
      }
    ].filter(filters.all(date));
    expect(jobs.length).toBe(1);
  });

  it('should run both jobs if repeats', () => {
    const date = new Date("2017-01-01 00:00:01Z")
    const jobs = [
      {
        jobName: 'job1',
        timeOfDay: "00:00:00.000Z",
        startAfter: "2016-01-01 00:00:00Z",
        daysOfWeek: ["1","1","1","1","1","1","1"],
        repeatMinutes: 10, // every 10 minutes
        lastRun: Math.round(date.getTime() / 1000) - 10 * 60, // last run is in secs.
      },
      {
        jobName: 'job2',
        timeOfDay: "00:00:00.000Z",
        startAfter: "2016-01-01 00:00:00Z",
        daysOfWeek: ["1","1","1","1","1","1","1"],
        repeatMinutes: 10, // every 10 minutes
        lastRun: Math.round(date.getTime() / 1000) - 11 * 60, // last run is in secs.
      }
    ].filter(filters.all(date));
    expect(jobs.length).toBe(2);
  });

  it('should run the second job if first is rejected', () => {
    const date = new Date("2017-01-01 00:00:01Z")
    const jobs = [
      {
        jobName: 'job1',
        timeOfDay: "00:00:00.000Z",
        startAfter: "2016-01-01 00:00:00Z",
        daysOfWeek: ["1","1","1","1","1","1","1"],
        repeatMinutes: 10, // every 10 minutes
        lastRun: Math.round(date.getTime() / 1000), // last run is in secs.
      },
      {
        jobName: 'job2',
        timeOfDay: "00:00:00.000Z",
        startAfter: "2016-01-01 00:00:00Z",
        daysOfWeek: ["1","1","1","1","1","1","1"],
        repeatMinutes: 10, // every 10 minutes
        lastRun: Math.round(date.getTime() / 1000) - 11 * 60, // last run is in secs.
      }
    ].filter(filters.all(date));
    expect(jobs.length).toBe(1);
    expect(jobs[0].jobName).toBe('job2');
  });

  it('should filter out a job based on day of week', () => {
    // Sunday
    const result = filters.daysOfWeek(new Date("2017-01-01 00:00:01Z"))({
      daysOfWeek: ["0","1","1","1","1","1","1"]
    })
    expect(result).toBe(false);
  });

  it('should filter in a job based on day of week', () => {
    // Monday
    const result = filters.daysOfWeek(new Date("2017-01-02 00:00:01Z"))({
      daysOfWeek: ["0","1","1","1","1","1","1"]
    })
    expect(result).toBe(true);
  });

  it('setups correctly the getters and setters', () => {
    const job = new JobSchedule();
    job.set({
      jobName: 'job',
      description: 'a long job description',
      params: '{}',
      startAfter: '2017-01-02 00:00:01Z',
      daysOfWeek: ["1", "1", "1", "1", "1", "1", "1"],
      timeOfDay: "00:00:00.100Z",
      lastRun: 0,
      repeatMinutes: 10,
    });

    expect(job.jobName).toBe('job');
    expect(job.description).toBe('a long job description');
    expect(job.params).toBe('{}');
    expect(job.startAfter).toBe('2017-01-02 00:00:01Z');
    expect(job.daysOfWeek.length).toBe(7);
    expect(job.timeOfDay).toBe('00:00:00.100Z');
    expect(job.lastRun).toBe(0);
    expect(job.repeatMinutes).toBe(10);
  });

  it('fails to run an invalid job schedule', (done) => {
    const job = new JobSchedule();
    job.set({
      jobName: 'job',
      description: 'a long job description',
      params: '{}',
      startAfter: '2017-01-02 00:00:01Z',
      daysOfWeek: ["1", "1", "1", "1", "1", "1", "1"],
      timeOfDay: "00:00:00.100Z",
      lastRun: 0,
      repeatMinutes: 10,
    });

    job
      .run(new Date())
      .then(done.fail)
      .catch((err) => {
        const error = JSON.parse(err.error);
        expect(error.code).toBe(141);
        expect(error.error).toBe('Invalid job.');
        done();
      });
  });

  it('run a valid job schedule', (done) => {
    Parse.Cloud.job('job', (req, res) => {
      res.success('OK!');
    });
    const job = new JobSchedule();
    job.set({
      jobName: 'job',
      description: 'a long job description',
      params: '{}',
      startAfter: '2017-01-02 00:00:01Z',
      daysOfWeek: ["1", "1", "1", "1", "1", "1", "1"],
      timeOfDay: "00:00:00.100Z",
      lastRun: 0,
      repeatMinutes: 10,
    });
    const now = new Date();
    job
      .run(now)
      .then(() => {
        expect(job.lastRun).toBe(Math.round(now / 1000));
      })
      .then(done)
      .catch(done.fail);
  });

  it('runs a scheduled job', (done) => {
    Parse.Cloud.job('job', (req, res) => {
      res.success('OK!');
    });
    const job = new JobSchedule();
    job.save({
      jobName: 'job',
      description: 'a long job description',
      params: '{}',
      startAfter: '2017-01-02 00:00:01Z',
      daysOfWeek: ["1", "1", "1", "1", "1", "1", "1"],
      timeOfDay: "00:00:00.100Z",
      lastRun: 0,
      repeatMinutes: 10,
    }, {useMasterKey: true})
      .then(() => {
        return JobSchedule.run();
      })
      .then(() => {
        return job.fetch({useMasterKey: true});
      })
      .then(job => {
        expect(job.lastRun).not.toBe(0);
      })
      .then(done)
      .catch(done.fail);
  });

  it('properly sends the params to the job', (done) => {
    let called = false;
    let params;
    const jobHandler = {
      handler: function(req, res) {
        called = true;
        params = req.params;
        res.success('OK!');
      }
    }
    Parse.Cloud.job('job', jobHandler.handler);

    const job = new JobSchedule();
    job.set({
      jobName: 'job',
      description: 'a long job description',
      params: JSON.stringify({hello: "world", key: 1}),
      startAfter: '2017-01-02 00:00:01Z',
      daysOfWeek: ["1", "1", "1", "1", "1", "1", "1"],
      timeOfDay: "00:00:00.100Z",
      lastRun: 0,
      repeatMinutes: 10,
    });
    const now = new Date();
    job
      .run(now)
      .then(() => {
        expect(called).toBe(true);
        expect(params).not.toBe(undefined);
        expect(params.hello).toBe('world');
        expect(params.key).toBe(1);
        expect(job.lastRun).toBe(Math.round(now / 1000));
      })
      .then(done)
      .catch(done.fail);
  });
});
