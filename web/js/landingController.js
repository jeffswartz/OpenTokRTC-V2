!(function (global) {
  const init = function () {
    LazyLoader.dependencyLoad([
      '/js/landingView.js',
    ]).then(() => {
      LandingView.init();
    });
  };

  global.LandingController = {
    init,
  };
}(this));
