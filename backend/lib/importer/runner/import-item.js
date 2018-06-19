'use strict';

const q = require('q');
const handler = require('../handler');
const { IMPORT_STATUS } = require('../../constants');

const TOKEN_TTL = 20000; // need to check later, 20s may not enough

module.exports = function(dependencies) {
  const coreUser = dependencies('user');
  const importItemModule = require('../../import-item')(dependencies);

  return {
    run
  };

  function run(job) {
    const { itemId } = job.data;

    return importItemModule.getById(itemId, { populations: { request: true } })
      .then(importItem => {
        const { rawData, request } = importItem;
        const { creator: userId, target, contentType } = request;

        const fileHandler = handler.get(contentType);

        if (!fileHandler) {
          return q.reject(new Error(`No file handler for file type "${contentType}"`));
        }

        return q.denodeify(coreUser.get)(userId)
          .then(createDavToken)
          .then(token => fileHandler.importItem(rawData, { target, token }))
          .then(
            () => importItemModule.updateById(itemId, { status: IMPORT_STATUS.succeed }),
            err => importItemModule.updateById(itemId, { status: IMPORT_STATUS.failed }).then(() => q.reject(err))
          );
      });
  }

  function createDavToken(user) {
    return q.denodeify(coreUser.getNewToken)(user, TOKEN_TTL).then(data => data.token);
  }
};
