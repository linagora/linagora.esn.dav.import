'use strict';

const q = require('q');
const handler = require('../handler');

const { JOB_QUEUE } = require('../../constants');

module.exports = function(dependencies) {
  const filestore = dependencies('filestore');
  const jobqueue = dependencies('jobqueue').lib;
  const importRequestModule = require('../../import-request')(dependencies);
  const importItemModule = require('../../import-item')(dependencies);

  return {
    run
  };

  function run(job) {
    const { requestId } = job.data;

    return importRequestModule.getById(requestId).then(processRequest);
  }

  function processRequest(importRequest) {
    const deferred = q.defer();

    filestore.get(importRequest.fileId, (err, meta, stream) => {
      if (err) {
        return deferred.reject(err);
      }

      if (!meta) {
        return deferred.reject(new Error(`File does not exist or deleted: ${importRequest.fileId}`));
      }

      const fileHandler = handler.get(meta.contentType);

      if (!fileHandler) {
        return deferred.reject(new Error(`No file handler for file type: ${meta.contentType}`));
      }

      stream.setEncoding('utf8');

      const promises = [];
      let remainingLines = [];

      stream.on('data', chunk => {
        const lines = chunk.split('\n');

        // because chunks are not split by newline character, we join the last
        // line of previous chunk with first line of this chunk to have a complete line
        if (remainingLines.length && lines.length) {
          lines[0] = remainingLines.pop() + lines[0];
        }

        const results = fileHandler.readLines(lines, remainingLines);

        remainingLines = results.remainingLines;

        results.items.forEach(item => {
          promises.push(
            createImportItem(importRequest.id, item).then(submitJob)
          );
        });
      });

      stream.on('end', () => {
        q.all(promises).then(deferred.resolve, deferred.reject);
      });

      stream.on('error', err => {
        deferred.reject(err);
      });

      // TODO: support notifying progress
    });

    return deferred.promise;
  }

  function createImportItem(requestId, item) {
    return importItemModule.create({
      request: requestId,
      rawData: item
    });
  }

  function submitJob(requestItem) {
    return jobqueue.initJobQueue().then(queue =>
      queue.create(JOB_QUEUE.IMPORT_ITEM, {
        title: `Import DAV item ${requestItem.id}`,
        itemId: requestItem.id
      })
      .save()
    );
  }
};
