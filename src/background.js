chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.runtime.onMessage.addListener(function (message) {
        if (message.url !== undefined) {
            chrome.tabs.create({ url: message.url});
          }
    });

    chrome.storage.sync.get(null, function (settings) {
        chrome.tabs.sendMessage(tab.id, {settings: settings});
    });
});

