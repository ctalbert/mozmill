var setupModule = function(module) {
  module.controller = mozmill.getBrowserController();
}

var testContentScreenshot = function() {
  controller.open('http://www.google.com/');
  controller.waitForPageLoad();

  controller.screenShot(controller.window.document, "~/Desktop/screen1.png");
  
  var searchForm = new elementslib.ID(controller.tabs.activeTab, "searchform");
  controller.screenShot(searchForm, "~/Desktop/screen2.png");
}

var testChromeScreenshot = function() {
  prefs = mozmill.getPreferencesController();
  controller.sleep(1000);  // Wait for prefs dialog to open

  controller.screenShot(prefs.window.document, "~/Desktop/screen3.png");

  var radio = new elementslib.ID(prefs.window.document, "saveTo");
  controller.screenShot(radio, "~/Desktop/screen4.png");
}
