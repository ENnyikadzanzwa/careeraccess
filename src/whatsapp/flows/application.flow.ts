import { WhatsAppSession } from '@prisma/client';
import prisma from '../../config/database';
import { sendWhatsAppMessage } from '../client';

export async function handleApplicationFlow(
  jid: string,
  phone: string,
  input: string,
  session: WhatsAppSession
): Promise<void> {
  const data = (session.data as Record<string, any>) || {};

  switch (session.step) {
    case 'APPLICATION_START':
      if (input === '1') {
        await sendWhatsAppMessage(jid,
          `Great! Type the name of the programme or institution you want to apply to.`
        );
        await updateSession(phone, 'APPLICATION_SEARCH', data);
      } else if (input === '2') {
        await sendWhatsAppMessage(jid,
          `Let's find a programme first.\n\nWhat subject or field interests you?\n\nType a keyword (e.g. "accounting", "engineering").`
        );
        await updateSession(phone, 'GUIDANCE_SEARCH', data);
      } else {
        await sendWhatsAppMessage(jid, 'Please reply with 1 or 2.');
      }
      break;

    case 'APPLICATION_SEARCH': {
      const programmes = await prisma.programme.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: input, mode: 'insensitive' } },
            { institution: { name: { contains: input, mode: 'insensitive' } } },
          ],
        },
        include: {
          institution: { select: { name: true, city: true, portalUrl: true } },
          intakes: { where: { isOpen: true } },
        },
        take: 5,
      });

      if (programmes.length === 0) {
        await sendWhatsAppMessage(jid,
          `No programmes found for "${input}".\n\nTry a different keyword or type *menu*.`
        );
        return;
      }

      data.appSearchResults = programmes.map((p) => p.id);
      let response = `*Select a programme to apply for:*\n\n`;
      programmes.forEach((p, i) => {
        response += `*${i + 1}.* ${p.name}\n   🏫 ${p.institution.name}\n`;
        if (p.applicationFee) response += `   💰 App fee: $${p.applicationFee}\n`;
        if (p.intakes.length > 0) response += `   ✅ Accepting applications\n`;
        else response += `   ⚠️ No open intake\n`;
        response += `\n`;
      });
      response += `Reply with a number to select.`;

      await sendWhatsAppMessage(jid, response);
      await updateSession(phone, 'APPLICATION_SELECT', data);
      break;
    }

    case 'APPLICATION_SELECT': {
      const idx = parseInt(input) - 1;
      if (isNaN(idx) || idx < 0 || idx >= (data.appSearchResults?.length || 0)) {
        await sendWhatsAppMessage(jid, 'Please select a valid option number.');
        return;
      }

      const programmeId = data.appSearchResults[idx];
      const programme = await prisma.programme.findUnique({
        where: { id: programmeId },
        include: { institution: true, intakes: { where: { isOpen: true } } },
      });

      if (!programme) {
        await sendWhatsAppMessage(jid, 'Programme not found. Type *menu* to start over.');
        return;
      }

      data.selectedProgramme = programmeId;

      // Check if institution has its own portal
      const hasPortal = !!programme.institution.portalUrl;

      let msg = `*Apply: ${programme.name}*\n`;
      msg += `🏫 ${programme.institution.name}\n\n`;

      if (programme.requiredDocuments.length > 0) {
        msg += `*Required Documents:*\n`;
        programme.requiredDocuments.forEach((doc) => {
          msg += `📎 ${doc}\n`;
        });
        msg += `\n`;
      }

      msg += `*How would you like to apply?*\n\n`;
      msg += `*1.* 📝 Self-Apply (free guidance)\n`;
      msg += `   We guide you step-by-step\n\n`;
      msg += `*2.* 🤝 Agent-Apply (premium)\n`;
      msg += `   Our agent applies for you ($10-25)\n\n`;

      if (hasPortal) {
        msg += `ℹ️ This institution has an online portal. `;
        msg += `Self-apply includes a step-by-step guide.\n\n`;
      }

      msg += `Reply 1 or 2.`;

      await sendWhatsAppMessage(jid, msg);
      await updateSession(phone, 'APPLICATION_MODE', data);
      break;
    }

    case 'APPLICATION_MODE': {
      const programme = await prisma.programme.findUnique({
        where: { id: data.selectedProgramme },
        include: { institution: true },
      });

      if (!programme) {
        await sendWhatsAppMessage(jid, 'Something went wrong. Type *menu* to start over.');
        return;
      }

      if (input === '1') {
        // Self-apply mode
        let msg = `*Self-Apply Guide: ${programme.name}*\n\n`;

        // Check for playbook
        const playbook = await prisma.applicationPlaybook.findFirst({
          where: { institutionName: { contains: programme.institution.name, mode: 'insensitive' } },
        });

        if (playbook) {
          const steps = playbook.steps as Array<{ step: number; instruction: string }>;
          msg += `*Step-by-step instructions:*\n\n`;
          steps.forEach((s) => {
            msg += `${s.step}. ${s.instruction}\n`;
          });
          if (playbook.portalUrl) {
            msg += `\n🔗 Portal: ${playbook.portalUrl}\n`;
          }
          if (playbook.paymentGuide) {
            msg += `\n💳 Payment: ${playbook.paymentGuide}\n`;
          }
        } else if (programme.institution.portalUrl) {
          msg += `1. Visit: ${programme.institution.portalUrl}\n`;
          msg += `2. Create an account or log in\n`;
          msg += `3. Find "${programme.name}" in the programmes list\n`;
          msg += `4. Fill in your personal details\n`;
          msg += `5. Upload required documents\n`;
          msg += `6. Pay the application fee ($${programme.applicationFee || 'varies'})\n`;
          msg += `7. Submit and save your confirmation\n`;
        } else {
          msg += `Contact the institution directly:\n`;
          if (programme.institution.phone) msg += `📞 ${programme.institution.phone}\n`;
          if (programme.institution.email) msg += `📧 ${programme.institution.email}\n`;
          if (programme.institution.address) msg += `📍 ${programme.institution.address}\n`;
        }

        msg += `\n📱 Upload your documents on our web platform for safekeeping:\n`;
        msg += `${process.env.PLATFORM_URL || 'https://careeraccess.co.zw'}/documents\n\n`;
        msg += `Type *menu* when done, or *status* to track later.`;

        await sendWhatsAppMessage(jid, msg);
        await updateSession(phone, 'MAIN_MENU', {});
      } else if (input === '2') {
        // Agent mode
        const user = await prisma.user.findFirst({ where: { phone } });
        if (!user) {
          await sendWhatsAppMessage(jid,
            `To use Agent-Apply, you need an account.\n\n` +
            `Please register at:\n${process.env.PLATFORM_URL || 'https://careeraccess.co.zw'}/register\n\n` +
            `Then come back and type *3* to start an application.`
          );
          await updateSession(phone, 'MAIN_MENU', {});
          return;
        }

        const fee = (programme.applicationFee || 0) + 15;
        let msg = `*Agent-Apply Service*\n\n`;
        msg += `Our trained agent will apply to ${programme.institution.name} on your behalf.\n\n`;
        msg += `*Service includes:*\n`;
        msg += `✅ Complete application submission\n`;
        msg += `✅ Document formatting & upload\n`;
        msg += `✅ Payment processing guidance\n`;
        msg += `✅ Confirmation evidence\n\n`;
        msg += `*Fee:* $${fee} (includes application fee)\n`;
        msg += `*Turnaround:* 48 hours\n\n`;
        msg += `*Important:* You may need to share an OTP code during the process.\n\n`;
        msg += `*1.* Proceed & pay\n`;
        msg += `*2.* Cancel\n\n`;
        msg += `By selecting 1, you consent to our agent applying on your behalf.`;

        data.agentFee = fee;
        await sendWhatsAppMessage(jid, msg);
        await updateSession(phone, 'APPLICATION_AGENT_CONFIRM', data);
      } else {
        await sendWhatsAppMessage(jid, 'Please reply with 1 or 2.');
      }
      break;
    }

    case 'APPLICATION_AGENT_CONFIRM': {
      if (input === '1') {
        const user = await prisma.user.findFirst({ where: { phone } });
        if (!user) {
          await sendWhatsAppMessage(jid, 'Account not found. Please register first.');
          await updateSession(phone, 'MAIN_MENU', {});
          return;
        }

        // Create application and agent job
        const application = await prisma.application.create({
          data: {
            userId: user.id,
            institutionId: (await prisma.programme.findUnique({ where: { id: data.selectedProgramme } }))!.institutionId,
            programmeId: data.selectedProgramme,
            mode: 'AGENT',
            status: 'DRAFT',
          },
        });

        await prisma.agentJob.create({
          data: {
            applicationId: application.id,
            userId: user.id,
            fee: data.agentFee || 15,
            consentGiven: true,
            consentAt: new Date(),
            slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });

        await prisma.consent.create({
          data: {
            userId: user.id,
            type: 'AGENT_APPLICATION',
            granted: true,
            details: `WhatsApp consent for agent application to programme ${data.selectedProgramme}`,
          },
        });

        await prisma.applicationTimeline.create({
          data: {
            applicationId: application.id,
            status: 'DRAFT',
            note: 'Agent application initiated via WhatsApp',
            createdBy: user.id,
          },
        });

        await sendWhatsAppMessage(jid,
          `*Application Created!* ✅\n\n` +
          `Your agent application has been submitted to our queue.\n\n` +
          `*Next steps:*\n` +
          `1. Complete payment on our web platform\n` +
          `2. Upload your documents if you haven't\n` +
          `3. We'll WhatsApp you when an agent picks it up\n\n` +
          `📱 Manage at: ${process.env.PLATFORM_URL || 'https://careeraccess.co.zw'}/dashboard\n\n` +
          `Type *status* anytime to check progress.`
        );
        await updateSession(phone, 'MAIN_MENU', {});
      } else {
        await sendWhatsAppMessage(jid, 'No problem! Type *menu* to see other options.');
        await updateSession(phone, 'MAIN_MENU', {});
      }
      break;
    }

    default:
      await sendWhatsAppMessage(jid, 'Type *menu* to see all options.');
      await updateSession(phone, 'MAIN_MENU', {});
  }
}

async function updateSession(phone: string, step: string, data: any): Promise<void> {
  await prisma.whatsAppSession.update({
    where: { phone },
    data: { step, data },
  });
}
