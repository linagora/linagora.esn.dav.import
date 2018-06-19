'use strict';

module.exports = function(dependencies) {
  const DavImportItem = dependencies('db').mongo.mongoose.model('DavImportItem');

  return {
    create,
    getById,
    updateById
  };

  function create(data) {
    return DavImportItem.create(data);
  }

  function getById(id, options = {}) {
    let query = DavImportItem.findOne({ _id: id });

    if (options.populations) {
      if (options.populations.request) {
        query = query.populate('request');
      }
    }

    return query.exec();
  }

  function updateById(itemId, modified) {
    return DavImportItem.update({ _id: itemId }, { $set: modified }).exec();
  }
};
