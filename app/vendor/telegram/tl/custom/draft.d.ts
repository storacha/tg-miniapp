import type { Entity } from "../../define";
import type { TelegramClient } from "../..";
import { Api } from "../api";
export declare class Draft {
    private _client;
    private readonly _entity?;
    private readonly _peer;
    private _inputEntity;
    private _text?;
    private _rawText?;
    private date?;
    private linkPreview?;
    private replyToMsgId?;
    constructor(client: TelegramClient, entity: Entity, draft: Api.TypeDraftMessage | undefined);
    get entity(): Entity | undefined;
    get inputEntity(): Api.TypeInputPeer | undefined;
}
