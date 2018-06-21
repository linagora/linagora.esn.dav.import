'use strict';

const handlerModule = require('./handler');
const { JOB_QUEUE } = require('../constants');

module.exports = function(dependencies) {
  const logger = dependencies('logger');
  const jobqueue = dependencies('jobqueue').lib;

  const importRequestModule = require('../import-request')(dependencies);
  const importItemRunner = require('./runner/import-item')(dependencies);
  const importRequestRunner = require('./runner/import-request')(dependencies);

  return {
    addFileHandler,
    getFileHandler,
    init,
    importFromFile
  };

  function addFileHandler(type, handler) {
    handlerModule.register(type, handler);
  }

  function getFileHandler(type) {
    return handlerModule.get(type);
  }

  function init() {
    jobqueue.initJobQueue().then(queue => {
      _registerJob(queue, JOB_QUEUE.IMPORT_REQUEST, importRequestRunner.run);
      _registerJob(queue, JOB_QUEUE.IMPORT_ITEM, importItemRunner.run);
    });
  }

  function importFromFile({ file, target, user }) {
    const title = `Import DAV items from file "${file.filename}" (ID: ${file._id})`;

    return importRequestModule.create({
        creator: user.id,
        fileId: file._id,
        contentType: file.contentType,
        target
      })
      .then(request => _submitJob(title, request.id));
  }

  function _registerJob(queue, jobName, jobRunner) {
    queue.process(jobName, (job, done) => {
      jobRunner(job).then(() => {
        logger.debug(`Job done: ${jobName} - ${job.data.title}`);
        done();
      }, err => {
        logger.error(`Job failed: ${jobName} - ${job.data.title}`, err);
        done(err);
      });
    });
  }

  function _submitJob(title, requestId) {
    return jobqueue.initJobQueue()
      .then(queue =>
        queue.create(JOB_QUEUE.IMPORT_REQUEST, { title, requestId }).save()
      );
  }
};
