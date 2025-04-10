"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionTCPObfuscated = void 0;
const buffer_1 = require("buffer/");
const Helpers_1 = require("../../Helpers");
const Connection_1 = require("./Connection");
const TCPAbridged_1 = require("./TCPAbridged");
const CTR_1 = require("../../crypto/CTR");
class ObfuscatedIO {
    constructor(connection) {
        this.header = undefined;
        this.connection = connection.socket;
        this._packetClass = connection.PacketCodecClass;
    }
    async initHeader() {
        // Obfuscated messages secrets cannot start with any of these
        const keywords = [
            buffer_1.Buffer.from("50567247", "hex"),
            buffer_1.Buffer.from("474554", "hex"),
            buffer_1.Buffer.from("504f5354", "hex"),
            buffer_1.Buffer.from("eeeeeeee", "hex"),
        ];
        let random;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            random = (0, Helpers_1.generateRandomBytes)(64);
            if (random[0] !== 0xef &&
                !random.slice(4, 8).equals(buffer_1.Buffer.alloc(4))) {
                let ok = true;
                for (const key of keywords) {
                    if (key.equals(random.slice(0, 4))) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    break;
                }
            }
        }
        random = random.toJSON().data;
        const randomReversed = buffer_1.Buffer.from(random.slice(8, 56)).reverse();
        // Encryption has "continuous buffer" enabled
        const encryptKey = buffer_1.Buffer.from(random.slice(8, 40));
        const encryptIv = buffer_1.Buffer.from(random.slice(40, 56));
        const decryptKey = buffer_1.Buffer.from(randomReversed.slice(0, 32));
        const decryptIv = buffer_1.Buffer.from(randomReversed.slice(32, 48));
        const encryptor = new CTR_1.CTR(encryptKey, encryptIv);
        const decryptor = new CTR_1.CTR(decryptKey, decryptIv);
        random = buffer_1.Buffer.concat([
            buffer_1.Buffer.from(random.slice(0, 56)),
            this._packetClass.obfuscateTag,
            buffer_1.Buffer.from(random.slice(60)),
        ]);
        random = buffer_1.Buffer.concat([
            buffer_1.Buffer.from(random.slice(0, 56)),
            buffer_1.Buffer.from(encryptor.encrypt(random).slice(56, 64)),
            buffer_1.Buffer.from(random.slice(64)),
        ]);
        this.header = random;
        this._encrypt = encryptor;
        this._decrypt = decryptor;
    }
    async read(n) {
        const data = await this.connection.readExactly(n);
        return this._decrypt.encrypt(data);
    }
    write(data) {
        this.connection.write(this._encrypt.encrypt(data));
    }
}
class ConnectionTCPObfuscated extends Connection_1.ObfuscatedConnection {
    constructor() {
        super(...arguments);
        this.ObfuscatedIO = ObfuscatedIO;
        this.PacketCodecClass = TCPAbridged_1.AbridgedPacketCodec;
    }
}
exports.ConnectionTCPObfuscated = ConnectionTCPObfuscated;
