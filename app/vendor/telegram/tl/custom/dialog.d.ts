import type { TelegramClient } from "../..";
import { Api } from "../api";
import type { Entity } from "../../define";
import { Draft } from "./draft";
import bigInt from "big-integer";
export declare class Dialog {
    _client: TelegramClient;
    dialog: Api.Dialog;
    pinned: boolean;
    folderId?: number;
    archived: boolean;
    message?: Api.Message;
    date: number;
    entity?: Entity;
    inputEntity: Api.TypeInputPeer;
    id?: bigInt.BigInteger;
    name?: string;
    title?: string;
    unreadCount: number;
    unreadMentionsCount: number;
    draft: Draft;
    isUser: boolean;
    isGroup: boolean;
    isChannel: boolean;
    constructor(client: TelegramClient, dialog: Api.Dialog, entities: Map<string, Entity>, message?: Api.Message);
}
