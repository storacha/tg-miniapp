import { Buffer } from "buffer/";
export declare class CTR {
    private cipher;
    constructor(key: Buffer, iv: Buffer);
    encrypt(data: any): Buffer;
}
