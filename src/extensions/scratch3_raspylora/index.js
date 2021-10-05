/*
  Todo: check license...

 This is a Scratch 3 extension to control python commands on a Raspberry Pi

 Copyright (c) 2021 Beat Temperli All rights reserved.
 Inspired by the work of Alan Yorinks.

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU AFFERO GENERAL PUBLIC LICENSE
 Version 3 as published by the Free Software Foundation; either
 or (at your option) any later version.
 This library is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 General Public License for more details.

 You should have received a copy of the GNU AFFERO GENERAL PUBLIC LICENSE
 along with this library; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 */

// Boiler plate from the Scratch Team
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const log = require('../../util/log');

// The following are constants used within the extension

// has an websocket message already been received
let alerted = false;

let connectionPending = false;

// general outgoing websocket message holder
let msg = null;
let lastMessage = null;
let lastMessageReceived = false;

// flag to indicate if the user connected to a board
let connected = false;

// flag to indicate if a websocket connect was ever attempted.
let connectAttempt = false;

// an array to buffer operations until socket is opened
let wait_open = [];
let theLocale = null;

const webserverIpAddress = '192.168.43.159';

// common
const FormNumberCall = {
    en: 'Send a number [NUMBER]',
    de: 'Schicke eine Nummer [NUMBER]'
};

const FormServerListener = {
    en: 'Receive [ECHO] from server',
    de: 'Erhalte [ECHO] vom Server'
};

// General Alert
const FormWSClosed = {
    en: 'WebSocket Connection Is Closed.',
    de: 'WebSocket-Verbindung geschlossen.'
};

class Scratch3RpiPython {
    constructor (runtime) {
        theLocale = this._setLocale();
        this.runtime = runtime;
    }

    getInfo () {
        theLocale = this._setLocale();
        // this.connect();

        return {
            id: 'raspipython',
            color1: '#0C5986',
            color2: '#34B0F7',
            name: 'Python Raspberry Pi',
            blockIconURI: 'data:image/png;base64,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AIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADCC4AOAEQQfAIwg+ABgBMEHACMIPgAYQfABwAiCDwBGEHwAMILgA4ARBB8AjCD4AGAEwQcAIwg+ABhB8AHACIIPAEYQfAAwguADgBEEHwCMIPgAYATBBwAjCD4AGEHwAcAIgg8ARhB8ADDiH0kHZ+HRDpA+AAAAAElFTkSuQmCC',
            blocks: [
                {
                    opcode: 'numberWrite',
                    blockType: BlockType.COMMAND,
                    text: FormNumberCall[theLocale],
                    arguments: {
                        n: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '10',
                            menu: 'digital_number'
                        }
                    }
                },
                {
                    opcode: 'listenToServer',
                    blockType: BlockType.HAT,
                    text: FormServerListener[theLocale],
                    arguments: {
                        ECHO: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0',
                            menu: 'listen_server'
                        }
                    }
                }
            ],
            menus: {
                digital_numbers: {
                    acceptReporters: true,
                    items: ['10', '20', '30', '40', '50', '60']
                },
                listen_server: {
                    acceptReporters: true,
                    items: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']
                }
            }
        };
    }

    // The block handlers
    // command blocks
    numberWrite (args) {
        log.info('connected');
        log.info(connected);
        log.info('connectionPending');
        log.info(connectionPending);

        if (!connected) {
            if (!connectionPending) {
                this.connect();
                connectionPending = true;
            }
        }

        if (connected) {
            log.info(args);
            const n = args.NUMBER;
            const number = parseInt(n, 10);

            msg = {display: number};
            msg = JSON.stringify(msg);
            log.info(msg);
            window.socketr.send(msg);
        } else {
            const callbackEntry = [this.numberWrite.bind(this), args];
            wait_open.push(callbackEntry);
        }
    }

    listenToServer (args, util) {
        if (lastMessageReceived) {
            log.info('listenToServer.');
            const echo = args['ECHO'];
            log.info(args);
            log.info(echo);
            lastMessageReceived = false;
            lastMessage = null;
            return true;
        }
    }

    _setLocale () {
        let nowLocale = '';
        switch (formatMessage.setup().locale) {
            case 'en':
                nowLocale = 'en';
                break;
            case 'de':
                nowLocale = 'de';
                break;
            default:
                nowLocale = 'en';
                break;
        }
        return nowLocale;
    }

    // end of block handlers

    // helpers
    connect () {
        if (connected) {
            // ignore additional connection attempts
            return;
        } else {
            connectAttempt = true;
            let url = "ws://" + webserverIpAddress + ":8820";
            log.info(url);
            window.socketr = new WebSocket(url);
        }


        // websocket event handlers
        window.socketr.onopen = function () {
            // connection complete
            connected = true;
            connectAttempt = true;

            for (let index = 0; index < wait_open.length; index++) {
                const data = wait_open[index];
                log.info('wait open data');
                log.info(data);
                data[0](data[1]);
            }
        };

        window.socketr.onclose = function () {
            if (alerted === false) {
                alerted = true;
                alert(FormWSClosed[theLocale]);
            }
            connected = false;
            connectAttempt = false;
            connectionPending = false;
            wait_open = [];
        };

        // reporter messages from the board
        window.socketr.onmessage = function (message) {
            log.info('onmessage');
            log.info(message);

            try {
                msg = JSON.parse(message.data);
                lastMessage = msg;
                lastMessageReceived = true;
                log.info(msg);
            } catch (error) {
                log.info(error);
            }
        };
    }
}

module.exports = Scratch3RpiPython;
