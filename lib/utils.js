const debug = require('debug')('parse-server-job-runner:filter');

function getDayUTCSeconds(date) {
  return date.getUTCSeconds() + (60 * date.getUTCMinutes()) + (60 * 60 * date.getUTCHours())
}

function getDayUTCMilliseconds(date) {
  return getDayUTCSeconds(date) * 1000 + date.getUTCMilliseconds()
}

const debugFilter = (job, name, result) => {
  debug(`${name}: ${job.jobName} - ${result}`);
}

const filters = {
  daysOfWeek: function(date) {
    const day = date.getUTCDay();
    return (job) => {
      const res = job.daysOfWeek[day] === '1';
      debugFilter(job, 'daysOfWeek', res);
      return res;
    }
  },
  startAfter: function(date) {
    const now = date.getTime();
    return (job) => {
      const res = new Date(job.startAfter).getTime() < now;
      debugFilter(job, 'startAfter', res);
      return res;
    }
  },
  timeOfDay: function(date) {
    const seconds = getDayUTCMilliseconds(date);
    return (job) => {
      // Append epoch so it's a read date (0)
      const res = (new Date("1-1-1970 " + job.timeOfDay).getTime() <= seconds)
      debugFilter(job, 'timeOfDay', res);
      return res;
    }
  },
  lastRun: function(date) {
    const now = Math.round(date.getTime() / 1000); // in seconds
    return (job) => {
      if (!job.lastRun) {
        return true; // job never ran and passed it all!
      }
      if (!job.repeatMinutes) { // not repeating job
        return false;
      }
      const res = (job.lastRun + (job.repeatMinutes * 60)) <= now;
      debugFilter(job, 'lastRun', res);
      return res;
    }
  },
  all: function(date) {
    const allFilters = [this.daysOfWeek, this.startAfter, this.timeOfDay, this.lastRun].map((func) => {
      return func(date);
    })
    let res = true;
    return (job) => {
      while (res && allFilters.length) {
        res = allFilters.shift()(job)
      }
      return res;
    }
  }
}

module.exports = {
  getDayUTCSeconds,
  getDayUTCMilliseconds,
  filters
}
