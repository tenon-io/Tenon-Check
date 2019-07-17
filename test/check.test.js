const chrome = require('sinon-chrome');
const sinon = require('sinon');
window.chrome = chrome;
window.alert = jest.fn();

const check = require('../src/check');

describe('check.js', function () {

	const settings = {
		apiKey: "c630990d2999c17ee2c4600df0a67ec6",
		inline: false,
		instanceUrl: "https://tenon.io",
	}

	const messageSpy = sinon.spy();
	const alertSpy = sinon.spy(alert);
	chrome.runtime.onMessage.addListener(messageSpy);

	test("should be called with arguments when user initiates extension", () => {
		chrome.runtime.onMessage.trigger({message: "TEST", settings: settings}, {id: "abcdef"});
		expect(messageSpy.withArgs({message: "TEST", settings: settings}, {id: "abcdef"}).callCount).toEqual(1);
	});
	
	test("should not proceed if settings are empty", () => {
		chrome.runtime.onMessage.trigger({message: "TEST_SOURCE", settings: {}}, {id: "abcdef"});
		expect(alertSpy).toHaveBeenCalledWith('Tenon-Check: The extension is not properly configured.');
		window.alert.mockClear();
	});

	test("should proceed if settings are not empty", () => {
		chrome.runtime.onMessage.trigger({message: "TEST_SOURCE", settings: settings}, {id: "abcdef"});
		expect(alertSpy).not.toHaveBeenCalled;
		window.alert.mockClear();
	});
});