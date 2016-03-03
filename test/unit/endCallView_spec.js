var assert = chai.assert;
var expect = chai.expect;
var should = chai.should();

describe('EndCallView', function() {

  var templateText;
  before(function() {
    templateText =
      window.__html__['test/unit/endCallView_spec.html'];
  });

  var now = Date.now();

  var model = {
    _listeners: {},
    _archives: {
      one: {
        id: '1',
        localDownloadURL: 'http://xxx.com/',
        recordingUser: 'aUser1',
        status: 'stopped',
        duration: 1,
        createdAt: now
      },
      two: {
        id: '2',
        localDownloadURL: 'http://yyy.com/',
        recordingUser: 'aUser2',
        status: 'started',
        duration: 50,
        createdAt: now - 1000
      },
      three: {
        id: '3',
        localDownloadURL: 'http://zzz.com/',
        recordingUser: 'aUser3',
        status: 'available',
        duration: 459,
        createdAt: now - 2000
      }
    },
    _fire: function(data) {
      this._archives = data;
      this._listeners.value[0].method(data);
    },
    addEventListener: function(type, fc) {
      if (!(type in this._listeners)) {
        this._listeners[type] = [];
      }
      this._listeners[type].push({
        method: fc,
        context: undefined
      });
    },
    init: function() {
      return Promise.resolve();
    },
    get archives() {
      return this._archives;
    }
  };

  before(function() {
    model._listeners = {};
  });

  describe('#init', function() {
    before(function() {
      var realEJS = window.EJS;
      window.EJS = function(aParams) {
        if (aParams.url === '/templates/endMeeting.ejs') {
          return new realEJS({ text: templateText });
        }
        return new realEJS(aParams);
      };
      Object.keys(realEJS).forEach(function(aKey) {
        if (aKey !== 'constructor' && realEJS.hasOwnProperty(aKey)) {
          window.EJS[aKey] = realEJS[aKey];
        }
      });
      window.EJS.restore = function() {
        window.EJS = realEJS;
      };
    });

    after(function() {
      window.EJS.restore();
    });

    it('should exist', function() {
      expect(EndCallView.init).to.exist;
      expect(EndCallView.init).to.be.a('function');
    });

    it('should be initialized properly without throwing', function() {
      EndCallView.init(model);
    });
  });

  describe('#EndCallController:endCall event', function() {
    before(function() {
      var endCallEvent = new CustomEvent('EndCallController:endCall');
      window.dispatchEvent(endCallEvent);
    });

    it('should render as many archives as the model holds', function() {
      var archiveList= document.querySelector('ul');
      expect(archiveList).to.be.defined;
      expect(archiveList.children.length).to.be.equal(Object.keys(model.archives).length);
    });
    it('should include the number of archives as a data field', function() {
      var archives = document.querySelector('.archives');
      expect(archives.dataset.recordings).to.be.equal(Object.keys(model.archives).length + '');
    });

    it('should allow deletion of archives', function(done) {
      var elem = document.querySelector('i');
      var ds = elem.dataset;
      var expected = { id: ds.id, action: ds.action, username: ds.username };
      window.addEventListener('archive', function deleteOrder(evt) {
        window.removeEventListener('archive', deleteOrder);
        var detail = evt.detail;
        var response = {
          id: detail.id,
          action: detail.action,
          username: detail.username
        };
        expect(response).to.be.deep.equal(expected);
        done();
      });
      elem.click();
    });
  });

  describe('#New call button', function() {
    it('should navigate to the main page when the new call button is pressed', function() {
      // Not testing this since it breaks the test framework (changes the document location)
    });
  });
});
