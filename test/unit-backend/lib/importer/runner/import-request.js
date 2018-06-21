const q = require('q');
const sinon = require('sinon');
const mockery = require('mockery');
const { expect } = require('chai');
const { Readable } = require('stream');

describe('The lib/importer/runner/import-request module', function() {
  let importRequestModuleMock, importItemModuleMock, jobqueueMock, filestoreMock;
  let getModule;

  beforeEach(function() {
    jobqueueMock = {
      lib: {
        initJobQueue: sinon.stub()
      }
    };
    filestoreMock = {};

    this.moduleHelpers.addDep('jobqueue', jobqueueMock);
    this.moduleHelpers.addDep('filestore', filestoreMock);

    importRequestModuleMock = {};
    importItemModuleMock = {};
    mockery.registerMock('../../import-request', () => importRequestModuleMock);
    mockery.registerMock('../../import-item', () => importItemModuleMock);

    getModule = () => require(this.moduleHelpers.backendPath + '/lib/importer/runner/import-request')(this.moduleHelpers.dependencies);
  });

  describe('The run fn', function() {
    let job;

    beforeEach(function() {
      job = {
        data: {
          requestId: 'requestId'
        }
      };
    });

    it('should fail if it cannot fetch the import request', function(done) {
      importRequestModuleMock.getById = sinon.stub().returns(q.reject(new Error('an_error')));

      getModule().run(job).catch(err => {
        expect(err.message).to.equal('an_error');
        expect(importRequestModuleMock.getById).to.have.been.calledWith(job.data.requestId);
        done();
      });
    });

    it('should fail if it cannot get file from filestore', function(done) {
      const request = {
        id: 'requestId',
        fileId: 'fileId'
      };

      importRequestModuleMock.getById = sinon.stub().returns(q(request));
      filestoreMock.get = sinon.spy((fileId, callback) => callback(new Error('an_error')));

      getModule().run(job).catch(err => {
        expect(err.message).to.equal('an_error');
        expect(filestoreMock.get).to.have.been.calledWith(request.fileId, sinon.match.func);
        done();
      });
    });

    it('should fail if file is not found', function(done) {
      const request = {
        id: 'requestId',
        fileId: 'fileId'
      };

      importRequestModuleMock.getById = sinon.stub().returns(q(request));
      filestoreMock.get = sinon.spy((fileId, callback) => callback(null, null));

      getModule().run(job).catch(err => {
        expect(err.message).to.contain('File does not exist or deleted');
        done();
      });
    });

    it('should fail if no file handler found', function(done) {
      const request = {
        id: 'requestId',
        fileId: 'fileId'
      };
      const file = {
        contentType: 'text/vcard'
      };

      importRequestModuleMock.getById = sinon.stub().returns(q(request));
      filestoreMock.get = sinon.spy((fileId, callback) => callback(null, file));

      getModule().run(job).catch(err => {
        expect(err.message).to.contain('No file handler for file type');
        done();
      });
    });

    describe('reading stream', function() {
      let stream, file, handler, request, queue;

      beforeEach(function() {
        stream = new Readable();
        stream._read = function(size) { /* do nothing */ }; // do nothing because we are mocking
        handler = {
          readLines: sinon.stub(),
          importItem: sinon.stub(),
          targetValidator() {}
        };
        file = {
          contentType: 'text/vcard'
        };
        request = {
          id: 'requestId',
          fileId: 'fileId'
        };

        require(this.moduleHelpers.backendPath + '/lib/importer/handler').register(file.contentType, handler);

        queue = {
          create: sinon.stub().returns({ save: sinon.stub().returns(q()) })
        };
        jobqueueMock.lib.initJobQueue.returns(q(queue));
      });

      it('should read the stream using UTF8 encoding and resolve on end event', function(done) {
        importRequestModuleMock.getById = sinon.stub().returns(q(request));
        filestoreMock.get = sinon.spy((fileId, callback) => {
          callback(null, file, stream);
        });
        stream.setEncoding = sinon.spy();

        getModule().run(job).then(() => {
          expect(stream.setEncoding).to.have.been.calledWith('utf8');
          done();
        })
        .catch(err => done(err || 'should resolve'));

        // to give stream some CPU cycles to register events
        setTimeout(() => stream.emit('end'), 0);
      });

      it('should import items found in each chunk', function(done) {
        const chunk1 = 'line1\nline2\nline3';
        const chunk2 = 'line4\nline5';

        importRequestModuleMock.getById = sinon.stub().returns(q(request));
        filestoreMock.get = sinon.spy((fileId, callback) => {
          callback(null, file, stream);
        });

        handler.readLines.onCall(0).returns({
          items: ['item1', 'item2'],
          remainingLines: []
        });
        handler.readLines.onCall(1).returns({
          items: ['item3', 'item4'],
          remainingLines: []
        });

        importItemModuleMock.create = sinon.stub().returns(q({ id: 'itemId' }));

        getModule().run(job).then(() => {
          expect(importItemModuleMock.create).to.have.been.callCount(4);
          expect(queue.create).to.have.been.callCount(4);
          done();
        })
        .catch(err => done(err || 'should resolve'));

        setTimeout(() => stream.emit('data', chunk1), 0);
        setTimeout(() => stream.emit('data', chunk2), 0);
        setTimeout(() => stream.emit('end'), 0);
      });

      it('should join last line of previous chunk with the first line of current chunk', function(done) {
        const chunk1 = 'line1\nline2\nline3';
        const chunk2 = 'line4\nline5';

        importRequestModuleMock.getById = sinon.stub().returns(q(request));
        filestoreMock.get = sinon.spy((fileId, callback) => {
          callback(null, file, stream);
        });

        handler.readLines.onCall(0).returns({
          items: ['item1'],
          remainingLines: ['item2', 'line3']
        });
        handler.readLines.onCall(1).returns({
          items: ['item3', 'item4'],
          remainingLines: []
        });

        importItemModuleMock.create = sinon.stub().returns(q({ id: 'itemId' }));

        getModule().run(job).then(() => {
          expect(handler.readLines.secondCall).to.have.been.calledWith(['line3line4', 'line5'], ['item2']);
          done();
        })
        .catch(err => done(err || 'should resolve'));

        setTimeout(() => stream.emit('data', chunk1), 0);
        setTimeout(() => stream.emit('data', chunk2), 0);
        setTimeout(() => stream.emit('end'), 0);
      });
    });
  });
});
