"use strict";
//
// Copyright (C) Microsoft. All rights reserved.
//
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = require("got");
const path = require("path");
const fs = require("fs");
const os = require("os");
const which = require("which");
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const logger_1 = require("../logger");
const adapter_1 = require("./adapter");
const adapterCollection_1 = require("./adapterCollection");
const ios8_1 = require("../protocols/ios/ios8");
const ios9_1 = require("../protocols/ios/ios9");
const ios12_1 = require("../protocols/ios/ios12");
const ios13_1 = require("../protocols/ios/ios13");
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
class IOSAdapter extends adapterCollection_1.AdapterCollection {
    constructor(id, socket, proxySettings) {
        super(id, socket, {
            port: proxySettings.proxyPort,
            proxyExePath: proxySettings.proxyPath,
            proxyExeArgs: proxySettings.proxyArgs
        });
        this._proxySettings = proxySettings;
        this._protocolMap = new Map();
        this._simulatorVersionMap = new Map();
    }
    getTargets() {
        const _super = Object.create(null, {
            getTargets: { get: () => super.getTargets }
        });
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.debug(`iOSAdapter.getTargets`);
            const devices = [];
            try {
                const { body } = yield got_1.default(this._url);
                const rawDevices = JSON.parse(body);
                for (const d of rawDevices) {
                    if (d.deviceId === 'SIMULATOR') {
                        // iwdb doesn't report a sim udid so we use the one passed in by the user. This only works because we only support a single simulator, if multiple sims were supported then it wouldn't work
                        d.version = yield this.getSimulatorVersion(this._proxySettings.simUdid);
                    }
                    else if (d.deviceOSVersion) {
                        d.version = d.deviceOSVersion;
                    }
                    else {
                        logger_1.debug(`error.iosAdapter.getTargets.getDeviceVersion.failed.fallback, device=${d}. Please update ios-webkit-debug-proxy to version 1.8.5`);
                        d.version = '9.3.0';
                    }
                    const adapterId = `${this._id}_${d.deviceId}`;
                    if (!this._adapters.has(adapterId)) {
                        const parts = d.url.split(':');
                        if (parts.length > 1) {
                            // Get the port that the ios proxy exe is forwarding for this device
                            const port = parseInt(parts[1], 10);
                            // Create a new adapter for this device and add it to our list
                            const adapter = new adapter_1.Adapter(adapterId, this._proxyUrl, { port: port });
                            adapter.start();
                            adapter.on('socketClosed', (id) => {
                                this.emit('socketClosed', id);
                            });
                            this._adapters.set(adapterId, adapter);
                        }
                    }
                    devices.push(d);
                }
            }
            catch (error) {
                // todo
            }
            return _super.getTargets.call(this, devices);
        });
    }
    connectTo(url, wsFrom) {
        const target = super.connectTo(url, wsFrom);
        if (!target) {
            throw new Error(`Target not found for ${url}`);
        }
        if (!this._protocolMap.has(target)) {
            const version = target.data.metadata.version;
            const protocol = this.getProtocolFor(version, target);
            this._protocolMap.set(target, protocol);
        }
        return target;
    }
    static getProxySettings(args) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.debug(`iOSAdapter.getProxySettings`);
            let settings = null;
            // Check that the proxy exists
            const proxyPath = yield IOSAdapter.getProxyPath();
            // Start with remote debugging enabled
            // Use default parameters for the ios_webkit_debug_proxy executable
            const proxyPort = args.proxyPort;
            const proxyArgs = [
                '--no-frontend',
                '--config=null:' + proxyPort + ',:' + (proxyPort + 1) + '-' + (proxyPort + 101)
            ];
            if (args.unixPort) {
                proxyArgs.push(`-s`, `unix:${args.unixPort}`);
            }
            settings = {
                proxyPath: proxyPath,
                proxyPort: proxyPort,
                proxyArgs: proxyArgs,
                simUdid: args.simUdid
            };
            return settings;
        });
    }
    static getSimulatorUnixSocket(simUDID) {
        logger_1.debug(`iOSAdapter.getSimulatorUnixSocket`);
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield execAsync('lsof -aUc launchd_sim');
                for (const output of stdout.split('com\.apple\.CoreSimulator\.SimDevice.')) {
                    if (!output.includes(simUDID)) {
                        continue;
                    }
                    const match = /\s+(\S+com\.apple\.webinspectord_sim\.socket)/.exec(output);
                    if (!match) {
                        return resolve(null);
                    }
                    return resolve(match[1]);
                }
            }
            catch (error) {
                return reject(error);
            }
        }));
    }
    static getProxyPath() {
        logger_1.debug(`iOSAdapter.getProxyPath`);
        return new Promise((resolve, reject) => {
            if (os.platform() === 'win32') {
                const proxy = process.env.SCOOP ?
                    path.resolve(__dirname, process.env.SCOOP + '/apps/ios-webkit-debug-proxy/current/ios_webkit_debug_proxy.exe') :
                    path.resolve(__dirname, process.env.USERPROFILE + '/scoop/apps/ios-webkit-debug-proxy/current/ios_webkit_debug_proxy.exe');
                try {
                    fs.statSync(proxy);
                    resolve(proxy);
                }
                catch (err) {
                    let message = `ios_webkit_debug_proxy.exe not found. Please install 'scoop install ios-webkit-debug-proxy'`;
                    reject(message);
                }
            }
            else if (os.platform() === 'darwin' || os.platform() === 'linux') {
                which('ios_webkit_debug_proxy', function (err, resolvedPath) {
                    if (err) {
                        reject('ios_webkit_debug_proxy not found. Please install ios_webkit_debug_proxy (https://github.com/google/ios-webkit-debug-proxy)');
                    }
                    else {
                        resolve(resolvedPath);
                    }
                });
            }
        });
    }
    getProtocolFor(version, target) {
        logger_1.debug(`iOSAdapter.getProtocolFor`);
        const parts = version.split('.');
        if (parts.length > 0) {
            const major = parseInt(parts[0], 10);
            const minor = parseInt(parts[1], 10);
            if (major <= 8) {
                return new ios8_1.IOS8Protocol(target);
            }
            if (major > 13 || major >= 13 && minor >= 4) {
                return new ios13_1.IOS13Protocol(target);
            }
            if (target.data.metadata.deviceId !== 'SIMULATOR' && major === 12 && minor === 2) {
                return new ios12_1.IOS12Protocol(target);
            }
        }
        return new ios9_1.IOS9Protocol(target);
    }
    getSimulatorVersion(udid) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._simulatorVersionMap.has(udid)) {
                return this._simulatorVersionMap.get(udid);
            }
            let iosVersion;
            try {
                const { stdout } = yield execAsync('xcrun simctl list --json');
                const { devices, runtimes } = JSON.parse(stdout);
                for (const [type, vals] of Object.entries(devices)) {
                    if (!type.includes('SimRuntime.iOS')) {
                        continue;
                    }
                    if (!Array.isArray(vals)) {
                        continue;
                    }
                    for (const val of vals) {
                        if (val.udid === udid) {
                            const runtime = runtimes.find(rt => rt.identifier === type);
                            iosVersion = runtime.version;
                            break;
                        }
                    }
                    if (iosVersion) {
                        break;
                    }
                }
            }
            catch (error) {
                iosVersion = '9.3.0';
            }
            this._simulatorVersionMap.set(udid, iosVersion);
            return iosVersion;
        });
    }
}
exports.IOSAdapter = IOSAdapter;
