# Tenon Check

This is the sub folder for the Firefox version of the Tenon-Check extension. 

## Building

this source code uses the node.js package JPM (Jetpack module package). To build the XPI, you need to:

* Install [node.js](http://nodejs.org) if you don't already have that.
* Run "npm install -g jpm" to install the Jetpack module package. If you already have that, or for future Firefox extensions, you can skip this step.
* Switch to the directory that contains this read-me file, and run "jpm xpi" to create the XPI file you can install into your Firefox instance.

This extension will currently create a toolbar button and global page context menu item that will check the current tab against the Tenon testing framework and give you back results of the accessibility of your page.
