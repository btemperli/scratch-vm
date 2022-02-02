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

function getMyLocalIp () {
    const os = require('os');
    const ip = require('ip');

    console.log('current ip: ' +  ip.address());
    console.log('current platform: ' +  os.platform());
    console.log('current hostname: ' +  os.hostname());

    if (os.hostname() === 'localhost') {
        return ip.address();
        // return '192.168.1.136';
    }

    return 'raspberrypi.local';
}

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

const webserverIpAddress = getMyLocalIp();

// common
const FormNumberCall = {
    en: 'Number → Display [NUMBER]',
    de: 'Nummer → Display [NUMBER]'
};

// common
const FormNumberSend = {
    en: 'Number → LoRa [NUMBER]',
    de: 'Nummer → LoRa [NUMBER]'
};

const FormServerListener = {
    en: 'A message from the network',
    de: 'Nachricht aus dem Netzwerk'
};

const ResponseFromServer = {
    en: 'LoRa Response',
    de: 'LoRa Nachricht'
}

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

        return {
            id: 'raspylora',
            color1: '#226666',
            color2: '#669999',
            name: 'Python Raspberry Pi',
            blockIconURI: 'data:image/png;base64,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',
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
                    opcode: 'numberSendLoRa',
                    blockType: BlockType.COMMAND,
                    text: FormNumberSend[theLocale],
                    arguments: {
                        n: {
                            type: ArgumentType.STRING
                        }
                    }
                },
                {
                    opcode: 'responseFromServer',
                    blockType: BlockType.REPORTER,
                    branchCount: 0,
                    terminal: false,
                    text: ResponseFromServer[theLocale],
                    arguments: {
                        // Required: the ID of the argument, which will be the name in the
                        // args object passed to the implementation function.
                        RESPONSE: {
                            // Required: type of the argument / shape of the block input
                            type: ArgumentType.STRING,
                            default: 'hello'
                        },
                    },

                    // Optional: the function implementing this block.
                    // If absent, assume `func` is the same as `opcode`.
                    func: 'loraMessageReporter'
                },
                {
                    opcode: 'listenToServer',
                    blockType: BlockType.HAT,
                    text: FormServerListener[theLocale]
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

    /**
     * COMMAND
     * Send a number to the display via the server
     *
     * Checks if the server is connected. Establish connection if not.
     * Sends a message {display: number} to the server.
     *
     * @param args
     */
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

        // run the "display" command
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

    /**
     * COMMAND
     * Send a number to LoRa via the server
     *
     * Checks if the server is connected. Establish connection if not.
     * Sends a message {send: number} to the server.
     *
     * @param args
     */
    numberSendLoRa (args) {
        // Same as always
        if (!connected) {
            if (!connectionPending) {
                this.connect();
                connectionPending = true;
            }
        }

        // run the "send" command
        if (connected) {
            log.info(args);
            const n = args.NUMBER;

            msg = {send: n.toString()};
            msg = JSON.stringify(msg);
            log.info(msg);
            window.socketr.send(msg);
        } else {
            const callbackEntry = [this.numberWrite.bind(this), args];
            wait_open.push(callbackEntry);
        }
    }

    /**
     * HAT
     * Listen to the server
     *
     * Is active when the server sends a response to scratch.
     *
     * @param args
     * @param util
     */
    listenToServer (args, util) {
        if (lastMessageReceived) {
            log.info('listenToServer.');
            const echo = args['ECHO'];
            log.info(args);
            log.info(echo);
            lastMessageReceived = false;
            return true;
        }
    }

    /**
     * REPORTER
     * Lora Message
     *
     * Takes the last received message from the server and saves it as a variable (or reporter).
     * @see https://github.com/LLK/scratch-vm/blob/develop/docs/extensions.md
     *
     * @param {object} args - the block's arguments.
     * @returns {string} a string which includes the received message.
     */
    loraMessageReporter (args) {
        let receivedMessage = '';

        if (lastMessage) {
            receivedMessage = lastMessage;
            lastMessage = null;
        }

        log.info('REPORTER: receive message.');
        log.info(receivedMessage);
        return receivedMessage;
    };

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
