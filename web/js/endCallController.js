!(function (exports) {
  const endCall = function () {
    Utils.sendEvent('EndCallController:endCall');
  };

  const eventHandlers = {
    'roomView:endCall': endCall,
  };

  const init = function (model, sessionId) {
    return LazyLoader.dependencyLoad([
      '/js/vendor/ejs_production.js',
      '/js/endCallView.js',
    ]).then(() => {
      EndCallView.init(model, sessionId);
      Utils.addEventsHandlers('', eventHandlers);
    });
  };

  exports.EndCallController = {
    init,
  };
}(this));
