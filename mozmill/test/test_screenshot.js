var setupModule = function(module) {
  module.controller = mozmill.getBrowserController();
}

var testContentScreenshot = function() {
  controller.open('http://www.google.com/');
  controller.waitForPageLoad();
  
  var logo = new elementslib.ID(controller.window.document, "hplogo");
  var searchForm = new elementslib.ID(controller.tabs.activeTab, "searchform");

  var mngb = new elementslib.ID(controller.tabs.activeTab, "mngb");
  var gb_1 = new elementslib.ID(controller.tabs.activeTab, "gb_1");

  controller.screenShot(controller.window, "~/Desktop/screen1.png", [logo, searchForm]);
  controller.screenShot(mngb, "~/Desktop/screen2.png", [gb_1]);
}

var testChromeScreenshot = function() {
  prefs = mozmill.getPreferencesController();
  controller.sleep(1000);  // Wait for prefs dialog to open

  var radio = new elementslib.ID(prefs.window.document, "saveTo");
  
  controller.screenShot(prefs.window, "~/Desktop/screen3.png", [radio]);
  controller.screenShot(radio, "~/Desktop/screen4.png");
}
