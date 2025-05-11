import { TelegramAuth } from "@/api"
import { getBotToken, telegramAPIHash, telegramAPIID } from "./constants"
import { validate as validateInitData, parse as parseInitData } from '@telegram-apps/init-data-node';
import { Session, StringSession } from "telegram/sessions";
import { TelegramClientParams } from "telegram/client/telegramBaseClient";
import { TelegramClient } from "telegram";
const defaultClientParams: TelegramClientParams = { connectionRetries: 5 }

const CURRENT_VERSION = "1";

export const initializeTelegram = async(telegramAuth: TelegramAuth) => {
  validateInitData(telegramAuth.initData, getBotToken())
  const session = new StringSession(telegramAuth.session) 
  console.debug("telegram parameters", telegramAPIID)
  const client = new TelegramClient(session, telegramAPIID, telegramAPIHash, defaultClientParams)
  console.debug("telegram initialized")
  if (!(await client.connect())) {
    throw new Error("failed to connect to telegram")
  }
  console.debug("telegram connected")
  return client
}

export const checkTelegramAuthorization = async (rawInitData: string, client: TelegramClient) => {
  if (!(await client.checkAuthorization())) {
    throw new Error("client authorization failed")
  }
  console.debug("telegram authorized")
  const initData = parseInitData(rawInitData)
  const user = await client.getMe()
  if (user.id.toString() !== (initData.user?.id.toString() || '0')) {
      throw new Error("authorized user does not match telegram mini-app user")
  }
  console.log("successful connection established")
  return user.id.toString()
}

export const initializeAuthorizedTelegram = async (telegramAuth: TelegramAuth) => {
  const client = await initializeTelegram(telegramAuth)
  await checkTelegramAuthorization(telegramAuth.initData, client)
  return client
}

export const saveSessionToString = (session: Session) => {
    if (!session.authKey || !session.serverAddress || !session.port) {
        return "";
    }
    // TS is weird
    const key = session.authKey.getKey();
    if (!key) {
        return "";
    }
    const dcBuffer = Buffer.from([session.dcId]);
    const addressBuffer = Buffer.from(session.serverAddress);
    const addressLengthBuffer = Buffer.alloc(2);
    addressLengthBuffer.writeInt16BE(addressBuffer.length, 0);
    const portBuffer = Buffer.alloc(2);
    portBuffer.writeInt16BE(session.port, 0);
  
    return (
        CURRENT_VERSION +
        StringSession.encode(
            Buffer.concat([
                new Uint8Array(dcBuffer.buffer),
                new Uint8Array(addressLengthBuffer),
                new Uint8Array(addressBuffer),
                new Uint8Array(portBuffer),
                new Uint8Array(key),
            ])
        )
    );
  }