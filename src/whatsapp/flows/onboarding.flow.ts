import { WhatsAppSession } from '@prisma/client';
import prisma from '../../config/database';
import { sendWhatsAppMessage } from '../client';

export async function handleOnboarding(
  jid: string,
  phone: string,
  input: string,
  session: WhatsAppSession
): Promise<void> {
  const data = (session.data as Record<string, any>) || {};

  switch (session.step) {
    case 'ONBOARDING_NAME':
      data.name = input;
      await sendWhatsAppMessage(jid,
        `Nice to meet you, ${input}! 👋\n\n` +
        `What is your education level?\n\n` +
        `*1.* O-Level (Form 4)\n` +
        `*2.* A-Level (Form 6)\n` +
        `*3.* Certificate\n` +
        `*4.* Diploma\n` +
        `*5.* Degree\n\n` +
        `Reply with a number.`
      );
      await updateSession(phone, 'ONBOARDING_LEVEL', data);
      break;

    case 'ONBOARDING_LEVEL': {
      const levels: Record<string, string> = {
        '1': 'O_LEVEL', '2': 'A_LEVEL', '3': 'CERTIFICATE',
        '4': 'DIPLOMA', '5': 'DEGREE',
      };
      const level = levels[input];
      if (!level) {
        await sendWhatsAppMessage(jid, 'Please reply with a number (1-5).');
        return;
      }
      data.educationLevel = level;

      if (level === 'O_LEVEL' || level === 'A_LEVEL') {
        await sendWhatsAppMessage(jid,
          `How many passes do you have at ${level === 'O_LEVEL' ? 'O-Level' : 'A-Level'}?\n\n` +
          `(Count subjects where you got A, B, or C)\n\n` +
          `Reply with a number (e.g. "5").`
        );
        await updateSession(phone, 'ONBOARDING_PASSES', data);
      } else {
        await askProvince(jid, phone, data);
      }
      break;
    }

    case 'ONBOARDING_PASSES': {
      const passes = parseInt(input);
      if (isNaN(passes) || passes < 0 || passes > 15) {
        await sendWhatsAppMessage(jid, 'Please enter a valid number of passes (0-15).');
        return;
      }
      data.passes = passes;
      await askProvince(jid, phone, data);
      break;
    }

    case 'ONBOARDING_PROVINCE': {
      const provinces: Record<string, string> = {
        '1': 'Harare', '2': 'Bulawayo', '3': 'Manicaland',
        '4': 'Mashonaland Central', '5': 'Mashonaland East',
        '6': 'Mashonaland West', '7': 'Masvingo', '8': 'Matabeleland North',
        '9': 'Matabeleland South', '10': 'Midlands',
      };
      const province = provinces[input];
      if (!province) {
        await sendWhatsAppMessage(jid, 'Please reply with a number (1-10).');
        return;
      }
      data.province = province;

      await sendWhatsAppMessage(jid,
        `Great! What are you most interested in?\n\n` +
        `*1.* Business & Commerce\n` +
        `*2.* Science & Technology\n` +
        `*3.* Health & Medicine\n` +
        `*4.* Engineering\n` +
        `*5.* Arts & Media\n` +
        `*6.* Agriculture\n` +
        `*7.* Education & Teaching\n` +
        `*8.* I'm not sure yet\n\n` +
        `Reply with a number.`
      );
      await updateSession(phone, 'ONBOARDING_INTEREST', data);
      break;
    }

    case 'ONBOARDING_INTEREST': {
      const interests: Record<string, string> = {
        '1': 'Business', '2': 'Technology', '3': 'Health',
        '4': 'Engineering', '5': 'Arts', '6': 'Agriculture',
        '7': 'Education', '8': 'Undecided',
      };
      data.interest = interests[input] || 'Undecided';

      await sendWhatsAppMessage(jid,
        `Thanks for sharing! Here's what I know about you:\n\n` +
        `👤 Name: ${data.name}\n` +
        `📚 Level: ${data.educationLevel?.replace(/_/g, ' ')}\n` +
        `${data.passes ? `✅ Passes: ${data.passes}\n` : ''}` +
        `📍 Province: ${data.province}\n` +
        `💡 Interest: ${data.interest}\n\n` +
        `Would you like me to find programmes for you?\n\n` +
        `*1.* Yes, show me programmes!\n` +
        `*2.* Take aptitude assessment first\n` +
        `*3.* Back to main menu`
      );
      await updateSession(phone, 'ONBOARDING_COMPLETE', data);
      break;
    }

    case 'ONBOARDING_COMPLETE':
      if (input === '1') {
        await updateSession(phone, 'GUIDANCE_SEARCH', data);
        await sendWhatsAppMessage(jid,
          `What subject or programme are you looking for?\n\nType a keyword (e.g. "accounting", "nursing", "IT") or type *menu* to go back.`
        );
      } else if (input === '2') {
        await updateSession(phone, 'GUIDANCE_ASSESSMENT_START', data);
        await sendWhatsAppMessage(jid,
          `Great! Let's discover your strengths.\n\nI'll ask you some quick questions. Ready?\n\n*1.* Yes, start!\n*2.* Back to menu`
        );
      } else {
        await updateSession(phone, 'MAIN_MENU', {});
        await sendWhatsAppMessage(jid, 'Type *menu* to see all options.');
      }
      break;
  }
}

async function askProvince(jid: string, phone: string, data: Record<string, any>): Promise<void> {
  await sendWhatsAppMessage(jid,
    `Which province are you in?\n\n` +
    `*1.* Harare\n` +
    `*2.* Bulawayo\n` +
    `*3.* Manicaland\n` +
    `*4.* Mashonaland Central\n` +
    `*5.* Mashonaland East\n` +
    `*6.* Mashonaland West\n` +
    `*7.* Masvingo\n` +
    `*8.* Matabeleland North\n` +
    `*9.* Matabeleland South\n` +
    `*10.* Midlands\n\n` +
    `Reply with a number.`
  );
  await updateSession(phone, 'ONBOARDING_PROVINCE', data);
}

async function updateSession(phone: string, step: string, data: any): Promise<void> {
  await prisma.whatsAppSession.update({
    where: { phone },
    data: { step, data },
  });
}
