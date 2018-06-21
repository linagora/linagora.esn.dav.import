const q = require('q');
const sinon = require('sinon');
const mockery = require('mockery');
const { expect } = require('chai');

describe('The lib/importer/index module', function() {
  let importRequestModuleMock, jobqueueMock, CONSTANTS;
  let getModule;

  beforeEach(function() {
    CONSTANTS = require(this.moduleHelpers.backendPath + '/lib/constants');

    jobqueueMock = {
      lib: {
        initJobQueue: sinon.stub()
      }
    };

    this.moduleHelpers.addDep('jobqueue', jobqueueMock);

    importRequestModuleMock = {};
    mockery.registerMock('../import-request', () => importRequestModuleMock);
    mockery.registerMock('./runner/import-item', () => {});
    mockery.registerMock('./runner/import-request', () => {});

    getModule = () => require(this.moduleHelpers.backendPath + '/lib/importer')(this.moduleHelpers.dependencies);
  });

  describe('The importFromFile fn', function() {
    it('should create a import request', function() {
      importRequestModuleMock.create = sinon.stub().returns(q.defer().promise);

      const file = {
        _id: 'fileId',
        contentType: 'text/vcard'
      };
      const target = '/addressbooks/bookHome/bookName.json';
      const user = { _id: 'userId' };

      getModule().importFromFile({ user, file, target });

      expect(importRequestModuleMock.create).to.have.been.calledWith({
        creator: user.id,
        fileId: file._id,
        contentType: file.contentType,
        target
      });
    });

    it('should submit the import request job', function(done) {
      const request = { id: 'requestId' };

      importRequestModuleMock.create = sinon.stub().returns(q(request));

      const file = {
        _id: 'fileId',
        contentType: 'text/vcard'
      };
      const target = '/addressbooks/bookHome/bookName.json';
      const user = { _id: 'userId' };
      const saveSpy = sinon.spy();
      const queue = {
        create: sinon.stub().returns({ save: saveSpy })
      };

      jobqueueMock.lib.initJobQueue.returns(q(queue));

      getModule().importFromFile({ user, file, target }).then(() => {
        expect(queue.create).to.have.been.calledWith(
          CONSTANTS.JOB_QUEUE.IMPORT_REQUEST,
          { requestId: request.id, title: sinon.match.string }
        );
        expect(saveSpy).to.have.been.calledWith();
        done();
      })
      .catch(err => done(err || 'should resolve'));
    });
  });
});
