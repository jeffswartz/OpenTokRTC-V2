var expect = chai.expect;

describe('roomController', () => {
  var expectedHandlers = ['signal:muteAll'];

  function getSignalEvent(connId, date, user) {
    return {
      connection: {
        data: JSON.stringify({ userName: user }),
        creationTime: date,
        connectionId: connId,
      },
    };
  }

  before(() => {
    window.LazyLoader = window.LazyLoader || { dependencyLoad() {} };
    sinon.stub(LazyLoader, 'dependencyLoad', resources => Promise.resolve());
    window.LazyLoader.load = resources => Promise.resolve();
    document.body.innerHTML = window.__html__['test/unit/roomView_spec.html'];
    window.MockOTHelper._install();
  });

  after(() => {
    window.MockOTHelper._restore();
    LazyLoader.dependencyLoad.restore();
  });

  it('should exist', () => {
    expect(RoomController).to.exist;
  });

  describe('#init', () => {
    it('should exist and be a function', () => {
      expect(RoomController.init).to.exist;
      expect(RoomController.init).to.be.a('function');
    });
/*
    it('should initialize properly the object and return the handlers set',
       sinon.test(() => {
         var handlers = [];

         RoomController.init(handlers);

         expect(handlers.length).to.be.equals(1);
         var statusHandlers = handlers[0];
         expect(expectedHandlers.every(elem => statusHandlers[elem] !== undefined)).to.be.true;
       })
    );
    */
  });
});
