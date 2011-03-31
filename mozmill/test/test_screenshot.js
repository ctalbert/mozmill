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
  var fctr = new elementslib.ID(controller.tabs.activeTab, "fctr");
  var about = new elementslib.Link(controller.tabs.activeTab, "About Google");
  controller.click(logo);

 // controller.screenShot(controller.window, "screen1", [logo, searchForm]);
 // controller.screenShot(mngb, "screen2", [gb_1]);
 // controller.screenShot(fctr, "screen3", [about]);
 // controller.sleep(10000);
}

var testDialogScreenshot = function() {
  prefs = mozmill.getPreferencesController();
  controller.sleep(1000);  // Wait for prefs dialog to open

  var radio = new elementslib.ID(prefs.window.document, "saveTo");
  var startup = new elementslib.ID(prefs.window.document, "paneMain");
  var homepage = new elementslib.ID(prefs.window.document, "browserHomePage");
  
  //controller.screenShot(prefs.window, "screen4", [radio]);
  //controller.screenShot(startup, "screen5", [homepage]);
}

var testChromeScreenshot = function() {
  var toolbox = new elementslib.ID(controller.window.document, "navigator-toolbox");
  var tabs = new elementslib.ID(controller.window.document, "tabbrowser-tabs");

  //controller.screenShot(controller.window, "screen6", [tabs]);
  //controller.screenShot(toolbox, "screen7", [tabs]);
}
