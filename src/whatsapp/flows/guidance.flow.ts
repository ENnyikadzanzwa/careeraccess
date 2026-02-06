import { WhatsAppSession } from '@prisma/client';
import prisma from '../../config/database';
import { sendWhatsAppMessage } from '../client';
import { AssessmentEngine } from '../../services/assessment.service';

const assessmentEngine = new AssessmentEngine();

export async function handleGuidanceFlow(
  jid: string,
  phone: string,
  input: string,
  session: WhatsAppSession
): Promise<void> {
  const data = (session.data as Record<string, any>) || {};

  switch (session.step) {
    case 'GUIDANCE_START':
      if (input === '1') {
        await sendWhatsAppMessage(jid,
          `What programme or subject are you interested in?\n\n` +
          `Type a keyword (e.g. "accounting", "computer science", "nursing").`
        );
        await updateSession(phone, 'GUIDANCE_SEARCH', data);
      } else if (input === '2') {
        await sendWhatsAppMessage(jid,
          `No worries! Let's figure it out together.\n\n` +
          `I'll need some info about you first. What's your first name?`
        );
        await updateSession(phone, 'ONBOARDING_NAME', data);
      } else if (input === '3') {
        await sendWhatsAppMessage(jid,
          `Let me check your eligibility.\n\n` +
          `What programme are you interested in? Type the name or a keyword.`
        );
        await updateSession(phone, 'GUIDANCE_ELIGIBILITY_SEARCH', data);
      } else {
        await sendWhatsAppMessage(jid, 'Please reply with 1, 2, or 3.');
      }
      break;

    case 'GUIDANCE_SEARCH': {
      const programmes = await prisma.programme.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: input, mode: 'insensitive' } },
            { faculty: { contains: input, mode: 'insensitive' } },
            { description: { contains: input, mode: 'insensitive' } },
          ],
        },
        include: {
          institution: { select: { name: true, city: true } },
          intakes: { where: { isOpen: true } },
        },
        take: 5,
        orderBy: { overallValueScore: 'desc' },
      });

      if (programmes.length === 0) {
        await sendWhatsAppMessage(jid,
          `I couldn't find programmes matching "${input}".\n\n` +
          `Try a different keyword, or type *menu* to go back.`
        );
        return;
      }

      data.searchResults = programmes.map((p) => p.id);
      let response = `*Found ${programmes.length} programme(s):*\n\n`;
      programmes.forEach((p, i) => {
        response += `*${i + 1}.* ${p.name}\n`;
        response += `   🏫 ${p.institution.name} (${p.institution.city})\n`;
        response += `   📜 ${p.qualificationLevel.replace(/_/g, ' ')}`;
        response += ` | ⏱ ${p.durationMonths} months\n`;
        if (p.tuitionFeeMin) response += `   💰 From $${p.tuitionFeeMin}/year\n`;
        if (p.overallValueScore) response += `   ⭐ Value Score: ${p.overallValueScore}/100\n`;
        if (p.intakes.length > 0) response += `   📅 Next intake open\n`;
        response += `\n`;
      });
      response += `Reply with a number for more details, or type a new search.`;

      await sendWhatsAppMessage(jid, response);
      await updateSession(phone, 'GUIDANCE_DETAILS', data);
      break;
    }

    case 'GUIDANCE_DETAILS': {
      const idx = parseInt(input) - 1;
      if (isNaN(idx) || idx < 0 || idx >= (data.searchResults?.length || 0)) {
        // Treat as new search
        await handleGuidanceFlow(jid, phone, input, { ...session, step: 'GUIDANCE_SEARCH' } as any);
        return;
      }

      const programmeId = data.searchResults[idx];
      const programme = await prisma.programme.findUnique({
        where: { id: programmeId },
        include: {
          institution: true,
          intakes: { where: { isOpen: true } },
        },
      });

      if (!programme) {
        await sendWhatsAppMessage(jid, 'Programme not found. Please try again.');
        return;
      }

      const reqs = programme.entryRequirements as Record<string, any>;
      let details = `*${programme.name}*\n`;
      details += `🏫 ${programme.institution.name}\n`;
      details += `📍 ${programme.institution.city}, ${programme.institution.province}\n\n`;
      details += `📜 Level: ${programme.qualificationLevel.replace(/_/g, ' ')}\n`;
      details += `⏱ Duration: ${programme.durationMonths} months\n`;
      details += `📖 Mode: ${programme.studyModes.join(', ')}\n`;
      if (programme.tuitionFeeMin) details += `💰 Fees: $${programme.tuitionFeeMin}${programme.tuitionFeeMax ? ` - $${programme.tuitionFeeMax}` : ''}/year\n`;
      if (programme.applicationFee) details += `📋 Application Fee: $${programme.applicationFee}\n`;

      details += `\n*Entry Requirements:*\n`;
      if (programme.oLevelMin) details += `- ${programme.oLevelMin}+ O-Level passes\n`;
      if (programme.aLevelMin) details += `- ${programme.aLevelMin}+ A-Level passes\n`;
      if (programme.requiredSubjects.length > 0) {
        details += `- Required subjects: ${programme.requiredSubjects.join(', ')}\n`;
      }

      if (programme.intakes.length > 0) {
        details += `\n*Open Intakes:*\n`;
        programme.intakes.forEach((i) => {
          details += `- ${i.name} ${i.year}`;
          if (i.closesAt) details += ` (closes ${i.closesAt.toLocaleDateString()})`;
          details += `\n`;
        });
      }

      if (programme.aiAutomationRisk && programme.aiAutomationRisk > 60) {
        details += `\n⚠️ *AI Impact Note:* This field has moderate-to-high automation risk. Consider building complementary digital skills.\n`;
      }

      details += `\n*What would you like to do?*\n`;
      details += `*1.* Apply for this programme\n`;
      details += `*2.* Check if I'm eligible\n`;
      details += `*3.* See similar programmes\n`;
      details += `*4.* Back to search\n`;

      data.selectedProgramme = programmeId;
      await sendWhatsAppMessage(jid, details);
      await updateSession(phone, 'GUIDANCE_ACTION', data);
      break;
    }

    case 'GUIDANCE_ACTION':
      if (input === '1') {
        await sendWhatsAppMessage(jid,
          `To apply, please use our web platform where you can:\n\n` +
          `- Upload required documents\n` +
          `- Track your application\n` +
          `- Make secure payments\n\n` +
          `Visit: ${process.env.PLATFORM_URL || 'https://careeraccess.co.zw'}/apply/${data.selectedProgramme}\n\n` +
          `Or type *3* from the main menu to start an application via WhatsApp.`
        );
        await updateSession(phone, 'MAIN_MENU', {});
      } else if (input === '2') {
        await sendWhatsAppMessage(jid,
          `To check eligibility, I need your results.\n\n` +
          `How many O-Level passes do you have? (Count A, B, C grades)\n\nReply with a number.`
        );
        data.eligibilityCheck = true;
        await updateSession(phone, 'GUIDANCE_ELIG_PASSES', data);
      } else if (input === '3') {
        await updateSession(phone, 'GUIDANCE_SEARCH', data);
        const programme = await prisma.programme.findUnique({ where: { id: data.selectedProgramme } });
        if (programme?.faculty) {
          await handleGuidanceFlow(jid, phone, programme.faculty, { ...session, step: 'GUIDANCE_SEARCH' } as any);
        } else {
          await sendWhatsAppMessage(jid, 'Type a keyword to search for similar programmes.');
        }
      } else {
        await updateSession(phone, 'GUIDANCE_SEARCH', {});
        await sendWhatsAppMessage(jid, 'Type a keyword to search programmes.');
      }
      break;

    case 'GUIDANCE_ELIG_PASSES': {
      const passes = parseInt(input);
      if (isNaN(passes) || passes < 0) {
        await sendWhatsAppMessage(jid, 'Please enter a valid number.');
        return;
      }
      data.oLevelPasses = passes;

      const programme = await prisma.programme.findUnique({
        where: { id: data.selectedProgramme },
        include: { institution: true },
      });

      if (!programme) {
        await sendWhatsAppMessage(jid, 'Programme not found. Type *menu* to start over.');
        return;
      }

      let result = `*Eligibility Check: ${programme.name}*\n\n`;

      let eligible = true;
      if (programme.oLevelMin && passes < programme.oLevelMin) {
        result += `❌ O-Level passes: ${passes}/${programme.oLevelMin} required\n`;
        eligible = false;
      } else if (programme.oLevelMin) {
        result += `✅ O-Level passes: ${passes}/${programme.oLevelMin} required\n`;
      }

      if (eligible) {
        result += `\n🎉 *You appear to meet the basic requirements!*\n\n`;
        result += `Note: Final eligibility depends on specific subject grades and other criteria.\n\n`;
        result += `*1.* Apply now\n*2.* Back to menu`;
      } else {
        result += `\n😔 *You don't meet the minimum requirements yet.*\n\n`;
        result += `*Suggestions:*\n`;
        result += `- Consider retaking exams to improve your passes\n`;
        result += `- Look at certificate-level programmes as a stepping stone\n`;
        result += `- Explore vocational training options\n\n`;
        result += `*1.* Show me alternative programmes\n*2.* Back to menu`;
      }

      await sendWhatsAppMessage(jid, result);
      await updateSession(phone, 'MAIN_MENU', {});
      break;
    }

    // Assessment flow via WhatsApp
    case 'GUIDANCE_ASSESSMENT_START':
      if (input === '1') {
        const questions = assessmentEngine.getQuestions();
        data.assessmentResponses = [];
        data.currentQuestion = 0;
        await sendAssessmentQuestion(jid, phone, questions[0], data);
      } else {
        await sendWhatsAppMessage(jid,
          `The aptitude assessment evaluates your strengths in:\n\n` +
          `- Verbal skills\n- Numerical skills\n- Logical thinking\n` +
          `- Creativity\n- Practical skills\n- Social skills\n\n` +
          `It also asks about your interests to suggest career fields.\n\n` +
          `*1.* Start assessment\n*2.* Back to menu`
        );
      }
      break;

    case 'GUIDANCE_ASSESSMENT_Q': {
      const questions = assessmentEngine.getQuestions();
      const qIdx = data.currentQuestion || 0;
      const question = questions[qIdx];

      const answerIdx = parseInt(input) - 1;
      if (isNaN(answerIdx) || answerIdx < 0 || answerIdx >= question.options.length) {
        await sendWhatsAppMessage(jid, `Please reply with a number (1-${question.options.length}).`);
        return;
      }

      data.assessmentResponses.push({
        questionId: question.id,
        answer: question.options[answerIdx].value,
      });

      const nextIdx = qIdx + 1;
      if (nextIdx < questions.length) {
        data.currentQuestion = nextIdx;
        await sendAssessmentQuestion(jid, phone, questions[nextIdx], data);
      } else {
        // Evaluate
        const results = assessmentEngine.evaluate(data.assessmentResponses);
        let response = `*Your Assessment Results*\n\n`;
        response += `📊 *Strength Scores:*\n`;
        response += `- Verbal: ${'█'.repeat(Math.round(results.verbal / 20))}${'░'.repeat(5 - Math.round(results.verbal / 20))} ${results.verbal}%\n`;
        response += `- Numerical: ${'█'.repeat(Math.round(results.numerical / 20))}${'░'.repeat(5 - Math.round(results.numerical / 20))} ${results.numerical}%\n`;
        response += `- Logical: ${'█'.repeat(Math.round(results.logical / 20))}${'░'.repeat(5 - Math.round(results.logical / 20))} ${results.logical}%\n`;
        response += `- Creative: ${'█'.repeat(Math.round(results.creative / 20))}${'░'.repeat(5 - Math.round(results.creative / 20))} ${results.creative}%\n`;
        response += `- Practical: ${'█'.repeat(Math.round(results.practical / 20))}${'░'.repeat(5 - Math.round(results.practical / 20))} ${results.practical}%\n`;
        response += `- Social: ${'█'.repeat(Math.round(results.social / 20))}${'░'.repeat(5 - Math.round(results.social / 20))} ${results.social}%\n\n`;
        response += `💪 *Top Strengths:* ${results.topStrengths.join(', ')}\n\n`;
        response += `🎯 *Suggested Fields:*\n`;
        results.suggestedFields.forEach((f) => { response += `- ${f}\n`; });
        response += `\n${results.summary}\n\n`;
        response += `*1.* Search programmes in suggested fields\n`;
        response += `*2.* Back to menu`;

        await sendWhatsAppMessage(jid, response);
        await updateSession(phone, 'MAIN_MENU', {});
      }
      break;
    }

    default:
      await sendWhatsAppMessage(jid, 'Type *menu* to see all options.');
      await updateSession(phone, 'MAIN_MENU', {});
  }
}

async function sendAssessmentQuestion(
  jid: string,
  phone: string,
  question: any,
  data: Record<string, any>
): Promise<void> {
  const total = new AssessmentEngine().getQuestions().length;
  let msg = `*Question ${(data.currentQuestion || 0) + 1}/${total}*\n\n`;
  msg += `${question.text}\n\n`;
  question.options.forEach((opt: any, i: number) => {
    msg += `*${i + 1}.* ${opt.label}\n`;
  });
  msg += `\nReply with a number.`;

  await sendWhatsAppMessage(jid, msg);
  await prisma.whatsAppSession.update({
    where: { phone },
    data: { step: 'GUIDANCE_ASSESSMENT_Q', data },
  });
}

async function updateSession(phone: string, step: string, data: any): Promise<void> {
  await prisma.whatsAppSession.update({
    where: { phone },
    data: { step, data },
  });
}
