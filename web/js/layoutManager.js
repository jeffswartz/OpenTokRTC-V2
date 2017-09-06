
!(function (global) {
  let userLayout = null;
  let currentLayout = null;
  let container = null;

  const items = {};

  let layouts;

  const HANGOUT_BY_DEFAULT = 'hangout_vertical';

  function isOnGoing(layout) {
    return Object.getPrototypeOf(currentLayout) === layout.prototype;
  }

  const handlers = {
    layout(evt) {
      userLayout = evt.detail.type;
      rearrange();
    },
    itemSelected(evt) {
      if (isGroup() && isOnGoing(Grid)) {
        userLayout = HANGOUT_BY_DEFAULT;
        rearrange(evt.detail.item);
      }
    },
    emptyStage(evt) {
      userLayout = 'grid';
      rearrange();
    },
  };

  function init(selector, enableHangoutScroll) {
    layouts = {
      grid: Grid,
      float: Float,
      f2f_horizontal: F2FHorizontal,
      f2f_vertical: F2FVertical,
      hangout_horizontal: HangoutHorizontal,
      hangout_vertical: HangoutVertical,
    };
    container = document.querySelector(selector);
    LayoutView.init(container);
    ItemsHandler.init(container, items);
    Utils.addEventsHandlers('layoutMenuView:', handlers, global);
    Utils.addEventsHandlers('layoutView:', handlers, global);
    Utils.addEventsHandlers('hangout:', handlers, global);
    return enableHangoutScroll ? LazyLoader.load([
      '/js/layoutViewport.js', '/css/hangoutScroll.css',
    ]).then(() => {
      LayoutViewport.init(container.querySelector('.tc-list ul'), '.stream');
    }) : Promise.resolve();
  }

  function isHangoutRequired(item) {
    // New screen shared and 3 or more items implies going to hangout if this isn't our current
    // layout running
    return Utils.isScreen(item) && isGroup() &&
           !(isOnGoing(HangoutHorizontal) || isOnGoing(HangoutVertical));
  }

  function append(id, options) {
    const item = LayoutView.append(id, options);
    items[id] = item;
    if (isHangoutRequired(item)) {
      userLayout = HANGOUT_BY_DEFAULT;
      rearrange(item);
    } else {
      rearrange();
    }
    Utils.sendEvent('layoutManager:itemAdded', {
      item,
    });
    return item.querySelector('.opentok-stream-container');
  }

  function remove(id) {
    const item = items[id];
    if (!item) {
      return;
    }

    LayoutView.remove(item);
    delete items[id];
    Utils.sendEvent('layoutManager:itemDeleted', {
      item,
    });
    rearrange();
  }

  function removeAll() {
    LayoutView.removeAll();
  }

  function getItemById(aId) {
    return items[aId];
  }

  function getTotal() {
    return Object.keys(items).length;
  }

  function calculateCandidateLayout() {
    let candidateLayout = null;

    if (getTotal() > 2) {
      candidateLayout = GRP_LAYOUTS[userLayout] ? layouts[userLayout] : Grid;
    } else {
      candidateLayout = F2F_LAYOUTS[userLayout] ? layouts[userLayout] : Float;
    }

    return candidateLayout;
  }

  var F2F_LAYOUTS = {
    float: true,
    f2f_horizontal: true,
    f2f_vertical: true,
  };

  var GRP_LAYOUTS = {
    grid: true,
    hangout_horizontal: true,
    hangout_vertical: true,
  };

  function isGroup() {
    return getTotal() > 2;
  }

  function updateAvailableLayouts() {
    Utils.sendEvent('layoutManager:availableLayouts', {
      layouts: isGroup() ? GRP_LAYOUTS : F2F_LAYOUTS,
    });
  }

  function rearrange(item) {
    const CandidateLayout = calculateCandidateLayout();

    if (!currentLayout || !isOnGoing(CandidateLayout)) {
      currentLayout && currentLayout.destroy();
      currentLayout = new CandidateLayout(container, items, item);
      Utils.sendEvent('layoutManager:layoutChanged');
    }

    currentLayout.rearrange();
    updateAvailableLayouts();
  }

  global.LayoutManager = {
    init,
    append,
    remove,
    removeAll,
    getItemById,
  };
}(this));
