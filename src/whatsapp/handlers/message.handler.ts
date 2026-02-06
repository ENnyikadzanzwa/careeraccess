import { proto } from '@whiskeysockets/baileys';
import prisma from '../../config/database';
import logger from '../../config/logger';
import { sendWhatsAppMessage } from '../client';
import { handleOnboarding } from '../flows/onboarding.flow';
import { handleGuidanceFlow } from '../flows/guidance.flow';
import { handleApplicationFlow } from '../flows/application.flow';

function extractMessageText(msg: proto.IWebMessageInfo): string {
  const m = msg.message;
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  ).trim();
}

export async function handleIncomingMessage(
  jid: string,
  msg: proto.IWebMessageInfo
): Promise<void> {
  const text = extractMessageText(msg);
  if (!text) return;

  const phone = jid.replace('@s.whatsapp.net', '');
  logger.info({ phone, text }, 'Incoming WhatsApp message');

  // Get or create session
  let session = await prisma.whatsAppSession.findUnique({ where: { phone } });
  if (!session) {
    session = await prisma.whatsAppSession.create({
      data: {
        phone,
        state: {},
        step: 'START',
      },
    });
  }

  // Update last message time
  await prisma.whatsAppSession.update({
    where: { phone },
    data: { lastMsgAt: new Date() },
  });

  const input = text.toLowerCase().trim();

  // Global commands
  if (input === 'menu' || input === 'hi' || input === 'hello' || input === 'start') {
    await showMainMenu(jid);
    await updateStep(phone, 'MAIN_MENU');
    return;
  }

  if (input === 'help') {
    await sendWhatsAppMessage(jid,
      `*CareerAccess Zimbabwe - Help*\n\n` +
      `Type any of these commands:\n` +
      `- *menu* - Show main menu\n` +
      `- *search [keyword]* - Search programmes\n` +
      `- *status* - Check your application status\n` +
      `- *help* - Show this help message\n\n` +
      `Or visit our web platform for full features.`
    );
    return;
  }

  if (input.startsWith('search ')) {
    const query = text.substring(7).trim();
    await handleSearch(jid, query);
    return;
  }

  if (input === 'status') {
    await handleStatusCheck(jid, phone);
    return;
  }

  // Route based on current step
  const step = session.step;

  if (step === 'START' || step === 'MAIN_MENU') {
    await handleMainMenuSelection(jid, phone, input);
  } else if (step.startsWith('ONBOARDING')) {
    await handleOnboarding(jid, phone, input, session);
  } else if (step.startsWith('GUIDANCE')) {
    await handleGuidanceFlow(jid, phone, input, session);
  } else if (step.startsWith('APPLICATION')) {
    await handleApplicationFlow(jid, phone, input, session);
  } else {
    await showMainMenu(jid);
    await updateStep(phone, 'MAIN_MENU');
  }
}

async function showMainMenu(jid: string): Promise<void> {
  await sendWhatsAppMessage(jid,
    `*Welcome to CareerAccess Zimbabwe!* 🎓\n\n` +
    `How can we help you today?\n\n` +
    `*1.* 📚 Find programmes & courses\n` +
    `*2.* 🧭 Get career guidance\n` +
    `*3.* 📝 Start an application\n` +
    `*4.* 📊 Take aptitude assessment\n` +
    `*5.* 📋 Check application status\n` +
    `*6.* 👤 Create/update my profile\n` +
    `*7.* ℹ️ How it works\n\n` +
    `Reply with a number (1-7) to get started.`
  );
}

async function handleMainMenuSelection(jid: string, phone: string, input: string): Promise<void> {
  switch (input) {
    case '1':
      await sendWhatsAppMessage(jid,
        `*Search Programmes*\n\n` +
        `What would you like to study? You can:\n\n` +
        `- Type a subject (e.g. "accounting", "nursing")\n` +
        `- Type a level (e.g. "diploma", "degree")\n` +
        `- Type an institution name\n\n` +
        `Or type *menu* to go back.`
      );
      await updateStep(phone, 'GUIDANCE_SEARCH');
      break;

    case '2':
      await sendWhatsAppMessage(jid,
        `*Career Guidance*\n\n` +
        `Let's find the best path for you!\n\n` +
        `*1.* I know what I want to study\n` +
        `*2.* I need help choosing\n` +
        `*3.* I want to check if I qualify for something\n\n` +
        `Reply with 1, 2, or 3.`
      );
      await updateStep(phone, 'GUIDANCE_START');
      break;

    case '3':
      await sendWhatsAppMessage(jid,
        `*Start Application*\n\n` +
        `Have you already found a programme?\n\n` +
        `*1.* Yes, I know which programme\n` +
        `*2.* No, help me find one first\n\n` +
        `Reply 1 or 2.`
      );
      await updateStep(phone, 'APPLICATION_START');
      break;

    case '4':
      await sendWhatsAppMessage(jid,
        `*Aptitude Assessment*\n\n` +
        `This short assessment will help us understand your strengths and suggest career paths.\n\n` +
        `It takes about 5 minutes. Ready to start?\n\n` +
        `*1.* Yes, let's go!\n` +
        `*2.* Tell me more first\n\n` +
        `Reply 1 or 2.`
      );
      await updateStep(phone, 'GUIDANCE_ASSESSMENT_START');
      break;

    case '5':
      await handleStatusCheck(jid, phone);
      break;

    case '6':
      await sendWhatsAppMessage(jid,
        `*Your Profile*\n\n` +
        `To create or update your profile, please visit our web platform:\n\n` +
        `${process.env.PLATFORM_URL || 'https://careeraccess.co.zw'}/register\n\n` +
        `Already registered? Log in to manage your profile and documents.`
      );
      break;

    case '7':
      await sendWhatsAppMessage(jid,
        `*How CareerAccess Works*\n\n` +
        `1️⃣ *Discover* - Search 100+ programmes across Zimbabwe\n` +
        `2️⃣ *Get Guided* - Honest guidance based on your results & interests\n` +
        `3️⃣ *Apply* - Apply yourself with our step-by-step guides, or let our agents apply for you\n` +
        `4️⃣ *Track* - Monitor your application status in real-time\n\n` +
        `*Self-Apply* (free guidance) or *Agent-Apply* (premium, we apply for you)\n\n` +
        `Type *menu* to explore!`
      );
      break;

    default:
      await sendWhatsAppMessage(jid,
        `I didn't understand that. Please reply with a number (1-7) or type *menu* to see options.`
      );
  }
}

async function handleSearch(jid: string, query: string): Promise<void> {
  const programmes = await prisma.programme.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { faculty: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { institution: { name: { contains: query, mode: 'insensitive' } } },
      ],
    },
    include: {
      institution: { select: { name: true, city: true } },
    },
    take: 5,
  });

  if (programmes.length === 0) {
    await sendWhatsAppMessage(jid,
      `No programmes found for "${query}".\n\nTry a different search term or type *menu* for more options.`
    );
    return;
  }

  let response = `*Search Results for "${query}":*\n\n`;
  programmes.forEach((p, i) => {
    response += `*${i + 1}.* ${p.name}\n`;
    response += `   📍 ${p.institution.name}, ${p.institution.city}\n`;
    response += `   📜 ${p.qualificationLevel.replace(/_/g, ' ')}\n`;
    if (p.tuitionFeeMin) response += `   💰 From $${p.tuitionFeeMin}\n`;
    response += `\n`;
  });
  response += `Reply with the number to learn more, or type *menu*.`;

  await sendWhatsAppMessage(jid, response);
}

async function handleStatusCheck(jid: string, phone: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { phone } });
  if (!user) {
    await sendWhatsAppMessage(jid,
      `You don't have an account yet.\n\nCreate one at ${process.env.PLATFORM_URL || 'https://careeraccess.co.zw'}/register or type *6* from the menu.`
    );
    return;
  }

  const applications = await prisma.application.findMany({
    where: { userId: user.id },
    include: {
      programme: { select: { name: true } },
      institution: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (applications.length === 0) {
    await sendWhatsAppMessage(jid,
      `You haven't submitted any applications yet.\n\nType *3* from the menu to start one!`
    );
    return;
  }

  let response = `*Your Applications:*\n\n`;
  applications.forEach((app, i) => {
    const statusEmoji: Record<string, string> = {
      DRAFT: '📝', SUBMITTED: '📨', UNDER_REVIEW: '🔍',
      ACCEPTED: '✅', CONDITIONALLY_ACCEPTED: '🟡',
      REJECTED: '❌', WITHDRAWN: '↩️', WAITLISTED: '⏳',
      DOCUMENTS_PENDING: '📎',
    };
    response += `*${i + 1}.* ${app.programme.name}\n`;
    response += `   🏫 ${app.institution.name}\n`;
    response += `   ${statusEmoji[app.status] || '📋'} Status: ${app.status.replace(/_/g, ' ')}\n\n`;
  });

  await sendWhatsAppMessage(jid, response);
}

async function updateStep(phone: string, step: string, data?: any): Promise<void> {
  await prisma.whatsAppSession.update({
    where: { phone },
    data: { step, ...(data !== undefined && { data }) },
  });
}
