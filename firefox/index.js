var self = require('sdk/self');

// Test the current tab's loaded page against tenon.io
var tabs = require("sdk/tabs");
function tenonCheckCurrentTab() {
  var urlToVisit = "http://tenon.io/testNow.php";
  var current = tabs.activeTab.url;
  tabs.open(urlToVisit + '?url=' + encodeURIComponent(current));
}

// We'll be using the context menu
var contextMenu = require("sdk/context-menu");
var menuItem = contextMenu.Item({
  // the label is pretty obvious...
  label: "Check page with Tenon.io",

  // the context tells Firefox which things should have this in their context
  // menu, as there are quite a few elements that get "their own" menu,
  // like "the page" vs "an image" vs "a link". We want the page to be checkable from
  // everywhere, so we make that happen:
  context: contextMenu.PredicateContext(function(data) { return true; }),

  // and finally the script that runs when we select the option. Tell us about accessibility!
  contentScript: 'self.on("click", self.postMessage);',
  onMessage: function() { tenonCheckCurrentTab(); }
});

// We'll also be adding a toolbar button
var buttons = require('sdk/ui/button/action');

var button = buttons.ActionButton({
  id: "tenon-check",
  label: "Check page with Tenon.io",
  icon: {
    "16": "./icon16.png",
    "32": "./icon32.png",
    "64": "./icon64.png"
  },
  onClick: function(state) {
    tenonCheckCurrentTab();
  }
});
