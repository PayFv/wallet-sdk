"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalWallet = void 0;
const address_1 = require("../address");
const bitcoin_core_1 = require("../bitcoin-core");
const keyring_1 = require("../keyring");
const message_1 = require("../message");
const network_1 = require("../network");
const types_1 = require("../types");
const utils_1 = require("../utils");
class LocalWallet {
    constructor(wif, addressType = types_1.AddressType.P2WPKH, networkType = network_1.NetworkType.MAINNET) {
        const network = (0, network_1.toPsbtNetwork)(networkType);
        const keyPair = bitcoin_core_1.ECPair.fromWIF(wif, network);
        this.keyring = new keyring_1.SimpleKeyring([keyPair.privateKey.toString("hex")]);
        this.keyring.addAccounts(1);
        this.pubkey = keyPair.publicKey.toString("hex");
        this.address = (0, address_1.publicKeyToAddress)(this.pubkey, addressType, networkType);
        this.network = network;
        this.networkType = networkType;
        this.addressType = addressType;
        this.scriptPk = (0, address_1.publicKeyToScriptPk)(this.pubkey, addressType, networkType);
    }
    static fromMnemonic(addressType, networkType, mnemonic, passPhrase, hdPath) {
        const keyring = new keyring_1.HdKeyring({
            mnemonic,
            hdPath,
            passphrase: passPhrase,
            activeIndexes: [0],
        });
        const _wallet = keyring.wallets[0];
        _wallet.network = (0, network_1.toPsbtNetwork)(networkType);
        const wallet = new LocalWallet(keyring.wallets[0].toWIF(), addressType, networkType);
        return wallet;
    }
    static fromRandom(addressType = types_1.AddressType.P2WPKH, networkType = network_1.NetworkType.MAINNET) {
        const network = (0, network_1.toPsbtNetwork)(networkType);
        const ecpair = bitcoin_core_1.ECPair.makeRandom({ network });
        const wallet = new LocalWallet(ecpair.toWIF(), addressType, networkType);
        return wallet;
    }
    getNetworkType() {
        return this.networkType;
    }
    async formatOptionsToSignInputs(_psbt, options) {
        const accountAddress = this.address;
        const accountPubkey = await this.getPublicKey();
        let toSignInputs = [];
        if (options && options.toSignInputs) {
            // We expect userToSignInputs objects to be similar to ToSignInput interface,
            // but we allow address to be specified in addition to publicKey for convenience.
            toSignInputs = options.toSignInputs.map((input) => {
                const index = Number(input.index);
                if (isNaN(index))
                    throw new Error("invalid index in toSignInput");
                if (!input.address &&
                    !input.publicKey) {
                    throw new Error("no address or public key in toSignInput");
                }
                if (input.address &&
                    input.address != accountAddress) {
                    throw new Error("invalid address in toSignInput");
                }
                if (input.publicKey &&
                    input.publicKey != accountPubkey) {
                    throw new Error("invalid public key in toSignInput");
                }
                const sighashTypes = input.sighashTypes?.map(Number);
                if (sighashTypes?.some(isNaN))
                    throw new Error("invalid sighash type in toSignInput");
                return {
                    index,
                    publicKey: accountPubkey,
                    sighashTypes,
                    disableTweakSigner: input.disableTweakSigner,
                };
            });
        }
        else {
            const networkType = this.getNetworkType();
            const psbtNetwork = (0, network_1.toPsbtNetwork)(networkType);
            const psbt = typeof _psbt === "string"
                ? bitcoin_core_1.bitcoin.Psbt.fromHex(_psbt, { network: psbtNetwork })
                : _psbt;
            psbt.data.inputs.forEach((v, index) => {
                let script = null;
                let value = 0;
                if (v.witnessUtxo) {
                    script = v.witnessUtxo.script;
                    value = v.witnessUtxo.value;
                }
                else if (v.nonWitnessUtxo) {
                    const tx = bitcoin_core_1.bitcoin.Transaction.fromBuffer(v.nonWitnessUtxo);
                    const output = tx.outs[psbt.txInputs[index].index];
                    script = output.script;
                    value = output.value;
                }
                const isSigned = v.finalScriptSig || v.finalScriptWitness;
                if (script && !isSigned) {
                    const address = (0, address_1.scriptPkToAddress)(script, this.networkType);
                    if (accountAddress === address) {
                        toSignInputs.push({
                            index,
                            publicKey: accountPubkey,
                            sighashTypes: v.sighashType ? [v.sighashType] : undefined,
                        });
                    }
                }
            });
        }
        return toSignInputs;
    }
    async signPsbt(psbt, opts) {
        const _opts = opts || {
            autoFinalized: true,
            toSignInputs: [],
        };
        let _inputs = await this.formatOptionsToSignInputs(psbt, opts);
        if (_inputs.length == 0) {
            throw new Error("no input to sign");
        }
        psbt.data.inputs.forEach((v, index) => {
            const isNotSigned = !(v.finalScriptSig || v.finalScriptWitness);
            const isP2TR = this.addressType === types_1.AddressType.P2TR ||
                this.addressType === types_1.AddressType.M44_P2TR;
            const lostInternalPubkey = !v.tapInternalKey;
            // Special measures taken for compatibility with certain applications.
            if (isNotSigned && isP2TR && lostInternalPubkey) {
                const tapInternalKey = (0, utils_1.toXOnly)(Buffer.from(this.pubkey, "hex"));
                const { output } = bitcoin_core_1.bitcoin.payments.p2tr({
                    internalPubkey: tapInternalKey,
                    network: (0, network_1.toPsbtNetwork)(this.networkType),
                });
                if (v.witnessUtxo?.script.toString("hex") == output?.toString("hex")) {
                    v.tapInternalKey = tapInternalKey;
                }
            }
        });
        psbt = await this.keyring.signTransaction(psbt, _inputs);
        if (_opts.autoFinalized) {
            _inputs.forEach((v) => {
                // psbt.validateSignaturesOfInput(v.index, validator);
                psbt.finalizeInput(v.index);
            });
        }
        return psbt;
    }
    async getPublicKey() {
        const pubkeys = await this.keyring.getAccounts();
        return pubkeys[0];
    }
    async signMessage(text, type) {
        if (type === "bip322-simple") {
            return await (0, message_1.signMessageOfBIP322Simple)({
                message: text,
                address: this.address,
                networkType: this.networkType,
                wallet: this,
            });
        }
        else {
            const pubkey = await this.getPublicKey();
            return await this.keyring.signMessage(pubkey, text);
        }
    }
    async signData(data, type = "ecdsa") {
        const pubkey = await this.getPublicKey();
        return await this.keyring.signData(pubkey, data, type);
    }
}
exports.LocalWallet = LocalWallet;
