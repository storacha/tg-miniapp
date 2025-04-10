import { ChatGetter } from "./chatGetter";
import { SenderGetter } from "./senderGetter";
import { Api } from "../api";
import type { TelegramClient } from "../../client/TelegramClient";
import type { Entity } from "../../define";
export declare class Forward extends SenderGetter {
    private originalFwd;
    constructor(client: TelegramClient, original: Api.MessageFwdHeader, entities: Map<string, Entity>);
}
export interface Forward extends ChatGetter, SenderGetter {
}
