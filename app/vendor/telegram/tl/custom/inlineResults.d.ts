import type { TelegramClient } from "../..";
import type { EntityLike } from "../../define";
import { Api } from "../api";
import { InlineResult } from "./inlineResult";
export declare class InlineResults extends Array<InlineResult> {
    private result;
    private queryId;
    private readonly cacheTime;
    private readonly _validUntil;
    private users;
    private gallery;
    private nextOffset;
    private switchPm;
    constructor(client: TelegramClient, original: Api.messages.TypeBotResults, entity?: EntityLike);
    resultsValid(): boolean;
}
