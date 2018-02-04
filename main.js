var electron = require('electron')
var request = require('request');
var app = electron.app
var Tray = electron.Tray
var currencyFormatter = require('currency-formatter');

var iconPath = 'IconTemplate.png'
var tray;

if (app.isReady()) appReady()
else app.on('ready', appReady)

function appReady(){
    app.dock.hide();
    tray = new Tray(iconPath);

    setInterval(getValue, 1000); 
}

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

function standardiseInput(input) {
    //remove any commas
    input = input.replace(/\,/g, "");
    input = Number(input);
    
    return currencyFormatter.format(input, { code: 'GBP' });
}

