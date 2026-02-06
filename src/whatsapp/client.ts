import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { existsSync, mkdirSync } from 'fs';
import logger from '../config/logger';
import { config } from '../config';
import { handleIncomingMessage } from './handlers/message.handler';

let sock: WASocket | null = null;

export function getWhatsAppSocket(): WASocket | null {
  return sock;
}

export async function sendWhatsAppMessage(jid: string, text: string): Promise<void> {
  if (!sock) {
    logger.warn('WhatsApp socket not connected');
    return;
  }
  await sock.sendMessage(jid, { text });
}

export async function sendWhatsAppButtons(
  jid: string,
  text: string,
  buttons: Array<{ buttonId: string; buttonText: { displayText: string } }>
): Promise<void> {
  if (!sock) return;
  await sock.sendMessage(jid, {
    text,
    footer: config.platform.name,
    buttons,
    headerType: 1,
  });
}

export async function sendWhatsAppList(
  jid: string,
  text: string,
  buttonText: string,
  sections: Array<{ title: string; rows: Array<{ title: string; rowId: string; description?: string }> }>
): Promise<void> {
  if (!sock) return;
  await sock.sendMessage(jid, {
    text,
    footer: config.platform.name,
    title: config.platform.name,
    buttonText,
    sections,
  });
}

export async function initWhatsApp(): Promise<void> {
  if (!config.whatsapp.enabled) {
    logger.info('WhatsApp integration disabled');
    return;
  }

  const sessionPath = config.whatsapp.sessionPath;
  if (!existsSync(sessionPath)) mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: logger as any,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('Scan the QR code above to connect WhatsApp');
    }

    if (connection === 'close') {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      logger.info(`WhatsApp connection closed. Reason: ${reason}. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => initWhatsApp(), 5000);
      }
    } else if (connection === 'open') {
      logger.info('WhatsApp connection established successfully');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;
      if (!jid) continue;

      try {
        await handleIncomingMessage(jid, msg);
      } catch (error) {
        logger.error({ error, jid }, 'Error handling WhatsApp message');
        await sendWhatsAppMessage(jid, 'Sorry, something went wrong. Please try again or type "menu" to start over.');
      }
    }
  });
}
