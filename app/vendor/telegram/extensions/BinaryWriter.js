"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinaryWriter = void 0;
const buffer_1 = require("buffer/");
class BinaryWriter {
    constructor(stream) {
        this._buffers = [stream];
    }
    write(buffer) {
        this._buffers.push(buffer);
    }
    getValue() {
        return buffer_1.Buffer.concat(this._buffers);
    }
}
exports.BinaryWriter = BinaryWriter;
