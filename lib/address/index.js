"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptPkToAddress = exports.getAddressType = exports.decodeAddress = exports.isValidAddress = exports.addressToScriptPk = exports.publicKeyToScriptPk = exports.publicKeyToAddress = exports.publicKeyToPayment = void 0;
const bitcoin_core_1 = require("../bitcoin-core");
const network_1 = require("../network");
const types_1 = require("../types");
/**
 * Convert public key to bitcoin payment object.
 */
function publicKeyToPayment(publicKey, type, networkType) {
    const network = (0, network_1.toPsbtNetwork)(networkType);
    if (!publicKey)
        return null;
    const pubkey = Buffer.from(publicKey, "hex");
    if (type === types_1.AddressType.P2PKH) {
        return bitcoin_core_1.bitcoin.payments.p2pkh({
            pubkey,
            network,
        });
    }
    else if (type === types_1.AddressType.P2WPKH || type === types_1.AddressType.M44_P2WPKH) {
        return bitcoin_core_1.bitcoin.payments.p2wpkh({
            pubkey,
            network,
        });
    }
    else if (type === types_1.AddressType.P2TR || type === types_1.AddressType.M44_P2TR) {
        return bitcoin_core_1.bitcoin.payments.p2tr({
            internalPubkey: pubkey.slice(1, 33),
            network,
        });
    }
    else if (type === types_1.AddressType.P2SH_P2WPKH) {
        const data = bitcoin_core_1.bitcoin.payments.p2wpkh({
            pubkey,
            network,
        });
        return bitcoin_core_1.bitcoin.payments.p2sh({
            pubkey,
            network,
            redeem: data,
        });
    }
}
exports.publicKeyToPayment = publicKeyToPayment;
/**
 * Convert public key to bitcoin address.
 */
function publicKeyToAddress(publicKey, type, networkType) {
    const payment = publicKeyToPayment(publicKey, type, networkType);
    if (payment && payment.address) {
        return payment.address;
    }
    else {
        return "";
    }
}
exports.publicKeyToAddress = publicKeyToAddress;
/**
 * Convert public key to bitcoin scriptPk.
 */
function publicKeyToScriptPk(publicKey, type, networkType) {
    const payment = publicKeyToPayment(publicKey, type, networkType);
    return payment.output.toString("hex");
}
exports.publicKeyToScriptPk = publicKeyToScriptPk;
/**
 * Convert bitcoin address to scriptPk.
 */
function addressToScriptPk(address, networkType) {
    const network = (0, network_1.toPsbtNetwork)(networkType);
    return bitcoin_core_1.bitcoin.address.toOutputScript(address, network);
}
exports.addressToScriptPk = addressToScriptPk;
/**
 * Check if the address is valid.
 */
function isValidAddress(address, networkType = network_1.NetworkType.MAINNET) {
    let error;
    try {
        bitcoin_core_1.bitcoin.address.toOutputScript(address, (0, network_1.toPsbtNetwork)(networkType));
    }
    catch (e) {
        error = e;
    }
    if (error) {
        return false;
    }
    else {
        return true;
    }
}
exports.isValidAddress = isValidAddress;
function decodeAddress(address) {
    const mainnet = bitcoin_core_1.bitcoin.networks.bitcoin;
    const testnet = bitcoin_core_1.bitcoin.networks.testnet;
    const regtest = bitcoin_core_1.bitcoin.networks.regtest;
    let decodeBase58;
    let decodeBech32;
    let networkType;
    let addressType;
    if (address.startsWith("bc1") ||
        address.startsWith("tb1") ||
        address.startsWith("bcrt1")) {
        try {
            decodeBech32 = bitcoin_core_1.bitcoin.address.fromBech32(address);
            if (decodeBech32.prefix === mainnet.bech32) {
                networkType = network_1.NetworkType.MAINNET;
            }
            else if (decodeBech32.prefix === testnet.bech32) {
                networkType = network_1.NetworkType.TESTNET;
            }
            else if (decodeBech32.prefix === regtest.bech32) {
                networkType = network_1.NetworkType.REGTEST;
            }
            if (decodeBech32.version === 0) {
                if (decodeBech32.data.length === 20) {
                    addressType = types_1.AddressType.P2WPKH;
                }
                else if (decodeBech32.data.length === 32) {
                    addressType = types_1.AddressType.P2WSH;
                }
            }
            else if (decodeBech32.version === 1) {
                if (decodeBech32.data.length === 32) {
                    addressType = types_1.AddressType.P2TR;
                }
            }
            return {
                networkType,
                addressType,
                dust: getAddressTypeDust(addressType),
            };
        }
        catch (e) { }
    }
    else {
        try {
            decodeBase58 = bitcoin_core_1.bitcoin.address.fromBase58Check(address);
            if (decodeBase58.version === mainnet.pubKeyHash) {
                networkType = network_1.NetworkType.MAINNET;
                addressType = types_1.AddressType.P2PKH;
            }
            else if (decodeBase58.version === testnet.pubKeyHash) {
                networkType = network_1.NetworkType.TESTNET;
                addressType = types_1.AddressType.P2PKH;
            }
            else if (decodeBase58.version === regtest.pubKeyHash) {
                // do not work
                networkType = network_1.NetworkType.REGTEST;
                addressType = types_1.AddressType.P2PKH;
            }
            else if (decodeBase58.version === mainnet.scriptHash) {
                networkType = network_1.NetworkType.MAINNET;
                addressType = types_1.AddressType.P2SH_P2WPKH;
            }
            else if (decodeBase58.version === testnet.scriptHash) {
                networkType = network_1.NetworkType.TESTNET;
                addressType = types_1.AddressType.P2SH_P2WPKH;
            }
            else if (decodeBase58.version === regtest.scriptHash) {
                // do not work
                networkType = network_1.NetworkType.REGTEST;
                addressType = types_1.AddressType.P2SH_P2WPKH;
            }
            return {
                networkType,
                addressType,
                dust: getAddressTypeDust(addressType),
            };
        }
        catch (e) { }
    }
    return {
        networkType: network_1.NetworkType.MAINNET,
        addressType: types_1.AddressType.UNKNOWN,
        dust: 546,
    };
}
exports.decodeAddress = decodeAddress;
function getAddressTypeDust(addressType) {
    if (addressType === types_1.AddressType.P2WPKH ||
        addressType === types_1.AddressType.M44_P2WPKH) {
        return 294;
    }
    else if (addressType === types_1.AddressType.P2TR ||
        addressType === types_1.AddressType.M44_P2TR) {
        return 330;
    }
    else {
        return 546;
    }
}
/**
 * Get address type.
 */
function getAddressType(address, networkType = network_1.NetworkType.MAINNET) {
    return decodeAddress(address).addressType;
}
exports.getAddressType = getAddressType;
/**
 * Convert scriptPk to address.
 */
function scriptPkToAddress(scriptPk, networkType = network_1.NetworkType.MAINNET) {
    const network = (0, network_1.toPsbtNetwork)(networkType);
    try {
        const address = bitcoin_core_1.bitcoin.address.fromOutputScript(typeof scriptPk === "string" ? Buffer.from(scriptPk, "hex") : scriptPk, network);
        return address;
    }
    catch (e) {
        return "";
    }
}
exports.scriptPkToAddress = scriptPkToAddress;
