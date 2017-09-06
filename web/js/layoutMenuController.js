!(function (global) {
  const init = function () {
    return LazyLoader.dependencyLoad([
      '/js/layoutMenuView.js',
    ]).then(() => LayoutMenuView.init());
  };

  global.LayoutMenuController = {
    init,
  };
}(this));
