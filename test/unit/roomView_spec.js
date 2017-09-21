var assert = chai.assert;
var expect = chai.expect;
var should = chai.should();

describe('RoomView', () => {
  var dock = null;

  before(() => {
    window.document.body.innerHTML = window.__html__['test/unit/roomView_spec.html'];
    dock = document.getElementById('dock');
  });

  it('should exist', () => {
    expect(RoomView).to.exist;
  });

  describe('#init()', () => {
    it('should export a init function', () => {
      expect(RoomView.init).to.exist;
      expect(RoomView.init).to.be.a('function');
    });

    it('should init the module', sinon.test(function () {
      this.stub(LayoutManager, 'init');
      RoomView.showRoom();
      RoomView.init();
    }));
  });

  describe('#roomControllerEvents', () => {
    it('should listen for roomController:controllersReady event', () => {
      expect(document.querySelectorAll('#call-controls [disabled]').length).to.equal(5);
      expect(document.querySelectorAll('#top-banner [disabled]').length).to.equal(3);
      RoomView.showRoom();
      window.dispatchEvent(new CustomEvent('roomController:controllersReady'));
      var selectorStr = '#top-banner [disabled], .call-controls [disabled]'
        + ':not(#toggle-publisher-video):not(#toggle-publisher-audio)';
      expect(document.querySelectorAll(selectorStr).length).to.equal(0);
    });
  });
});
