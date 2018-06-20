const q = require('q');
const sinon = require('sinon');
const mockery = require('mockery');
const { expect } = require('chai');

describe('The lib/importer/runner/import-item module', function() {
  let importItemModuleMock, userMock;
  let getModule;

  beforeEach(function() {
    userMock = {};

    this.moduleHelpers.addDep('user', userMock);

    importItemModuleMock = {
      getById: sinon.stub(),
      updateById: sinon.stub().returns(q())
    };
    mockery.registerMock('../../import-item', () => importItemModuleMock);

    getModule = () => require(this.moduleHelpers.backendPath + '/lib/importer/runner/import-item')(this.moduleHelpers.dependencies);
  });

  describe('The run fn', function() {
    let job;

    beforeEach(function() {
      job = {
        data: {
          itemId: 'itemId'
        }
      };
    });

    it('should reject if it cannot get import item', function(done) {
      importItemModuleMock.getById.returns(q.reject(new Error('an_error')));

      getModule().run(job).catch(err => {
        expect(err.message).to.equal('an_error');
        done();
      });
    });

    it('should get import item with request populated', function() {
      importItemModuleMock.getById.returns(q.defer().promise);

      getModule().run(job);

      expect(importItemModuleMock.getById).to.have.been.calledWith(job.data.itemId, { populations: { request: true } });
    });

    it('should reject if no file handler found', function(done) {
      importItemModuleMock.getById.returns(q({
        rawData: 'rawData',
        request: {
          creator: 'creator',
          target: 'target',
          contentType: 'text/vcard'
        }
      }));

      getModule().run(job).catch(err => {
        expect(err.message).to.contain('No file handler for file type');
        done();
      });
    });

    it('should import item using file handler', function(done) {
      const handler = {
        readLines() {},
        importItem: sinon.stub(),
        targetValidator() {}
      };
      const importItem = {
        rawData: 'rawData',
        request: {
          creator: 'creator',
          target: 'target',
          contentType: 'text/vcard'
        }
      };

      require(this.moduleHelpers.backendPath + '/lib/importer/handler').register(importItem.request.contentType, handler);
      importItemModuleMock.getById.returns(q(importItem));
      handler.importItem.returns(q());
      userMock.get = sinon.spy((id, callback) => callback());
      userMock.getNewToken = sinon.spy((user, ttl, callback) => callback(null, { token: 'token' }));

      getModule().run(job).then(() => {
        expect(handler.importItem).to.have.been.calledWith(importItem.rawData, { target: importItem.request.target, token: 'token' });
        done();
      })
      .catch(err => done(err || 'should resolve'));
    });
  });
});
