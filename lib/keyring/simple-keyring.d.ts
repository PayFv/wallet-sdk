/// <reference types="node" />
import { EventEmitter } from "events";
import { ECPairInterface, bitcoin } from "../bitcoin-core";
export declare class SimpleKeyring extends EventEmitter {
    static type: string;
    type: string;
    network: bitcoin.Network;
    wallets: ECPairInterface[];
    constructor(opts?: any);
    serialize(): Promise<any>;
    deserialize(opts: any): Promise<void>;
    addAccounts(n?: number): Promise<string[]>;
    getAccounts(): Promise<string[]>;
    signTransaction(psbt: bitcoin.Psbt, inputs: {
        index: number;
        publicKey: string;
        sighashTypes?: number[];
        disableTweakSigner?: boolean;
    }[], opts?: any): Promise<bitcoin.Psbt>;
    signMessage(publicKey: string, text: string): Promise<string>;
    verifyMessage(publicKey: string, text: string, sig: string): Promise<any>;
    signData(publicKey: string, data: string, type?: "ecdsa" | "schnorr"): Promise<string>;
    private _getPrivateKeyFor;
    exportAccount(publicKey: string): Promise<string>;
    removeAccount(publicKey: string): void;
    private _getWalletForAccount;
}
export declare function verifySignData(publicKey: string, hash: string, type: "ecdsa" | "schnorr", signature: string): boolean;
