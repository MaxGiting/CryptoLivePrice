var fs = require('fs')
var path = require('path')
var electron = require('electron')
var request = require('request');
var app = electron.app
var Tray = electron.Tray
var currencyFormatter = require('currency-formatter');
var BrowserWindow = electron.BrowserWindow
var Positioner = require('electron-positioner')
var ipcMain= require('electron');

electron.ipcMain.on('changedFiatCurrency', (event, currency) => {
    console.log('Currency changed to '+currency)
    selectedFiatCurrency = currency;
})

var iconPath = 'IconTemplate.png'
var tray;
var window;
var showOnAllWorkspaces = true
var alwaysOnTop = true
index = 'file://' + path.join(app.getAppPath(), 'index.html')
var supportsTrayHighlightState = false;
var supportedExchangeRateCurrencies;
var selectedFiatCurrency = 'USD';

var windowPosition = (process.platform === 'win32') ? 'trayBottomCenter' : 'trayCenter';


if (app.isReady()) appReady()
else app.on('ready', appReady)

/**
 * Setup the menubar and start calling the api when ready
 */
function appReady(){
    app.dock.hide();
    tray = new Tray(iconPath);

    try {
        tray.setHighlightMode('never')
        supportsTrayHighlightState = true
    } catch (e) { 
        console.log(e);
    };

    tray.on('click', clicked)
    tray.on('double-click', clicked)
    setInterval(getValue, 1000);
    getSupportedExchangeRateCurrencies();
}

function getSupportedExchangeRateCurrencies() {
    request(
        {
            url: 'https://free.currencyconverterapi.com/api/v5/currencies',
            json: true
        },
        function (error, response, body) {
            if (!error && response.statusCode === 200) {
                supportedExchangeRateCurrencies = body;
            }
        });
}

/**
 * Set the menubar price value
 * 
 * @param {string} value 
 */
function setTitle(value) {
    value = standardiseInput(value)
    tray.setTitle(value);
}

/**
 * Retrieve the current price from CoinDesk API
 */
getValue = function getValue() {

    request(
        {
            url: 'https://api.coindesk.com/v1/bpi/currentprice.json',
            json: true
        },
        function (error, response, body) {
            if (!error && response.statusCode === 200) {       
                setTitle(body['bpi']['GBP']['rate']); 
            }
        });
}

/**
 * Convert api input to a number
 * 
 * @param {string} input 
 */
function standardiseInput(input) {
    //remove any commas
    input = input.replace(/\,/g, "");
    input = Number(input);
    
    return currencyFormatter.format(input, { code: 'GBP' });
}

/**
 * 
 * 
 * @param {object} trayPos 
 */
function showWindow(trayPos) {
    if (supportsTrayHighlightState) tray.setHighlightMode('always')
    if (!window) {
        createWindow()
    }

    // Default the window to the right if `trayPos` bounds are undefined or null.
    var noBoundsPosition = null
    if ((trayPos === undefined || trayPos.x === 0)) {
        noBoundsPosition = (process.platform === 'win32') ? 'bottomRight' : 'topRight'
    }

    var position = positioner.calculate(noBoundsPosition || windowPosition, trayPos)

    var x = position.x
    var y = position.y

    window.setPosition(x, y)
    window.show()
    window.webContents.openDevTools();
    window.webContents.on('did-finish-load', () => {
        currencies = currencyFormatter.currencies;
        currencies.forEach(function(element, key) {
            if (!supportedExchangeRateCurrencies.results.hasOwnProperty(element.code)) {
                // delete currencies[key]
                currencies.splice(key, 1);
            }
        });
        window.webContents.send('currencies', [currencies, selectedFiatCurrency]);        
        window.webContents.send('supported', supportedExchangeRateCurrencies);        
    })
    return
}

/**
 * Create the apps settings window
 */
function createWindow() {
    var defaults = {
        show: false,
        frame: false
    }


    window = new BrowserWindow(defaults)

    positioner = new Positioner(window)

    window.on('blur', function () {
        alwaysOnTop ? '' : hideWindow()
    })

    if (showOnAllWorkspaces !== false) {
        window.setVisibleOnAllWorkspaces(true)
    }

    window.on('close', windowClear)
    window.loadURL(index)
}

/**
 * Delete the apps settings window
 */
function windowClear() {
    delete window
}

/**
 * When the menubar is clicked show the settings window
 * 
 * @param {object} e 
 * @param {object} bounds 
 */
function clicked(e, bounds) {
    if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return hideWindow()
    if (window && window.isVisible()) return hideWindow()
    cachedBounds = bounds || cachedBounds
    showWindow(cachedBounds)

}

/**
 * Hide the apps settings window
 */
function hideWindow() {
    if (supportsTrayHighlightState) tray.setHighlightMode('never')
    if (!window) return
    window.hide()
}


