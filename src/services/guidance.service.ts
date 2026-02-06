import prisma from '../config/database';
import { LearnerProfile, Programme } from '@prisma/client';

interface EligibilityResult {
  eligible: boolean;
  score: number;
  meets: string[];
  missing: string[];
  nearMiss: boolean;
  improvementSteps: string[];
}

interface RecommendationResult {
  eligible: Programme[];
  bestFit: Programme[];
  nearMiss: Array<Programme & { gap: string[] }>;
  alternatives: Programme[];
}

interface ValueAnalysis {
  programmeId: string;
  programmeName: string;
  institutionName: string;
  scores: {
    demandScore: number;
    remoteOpportunity: number;
    selfEmployment: number;
    capitalRequirement: number;
    timeToIncome: number;
    aiAutomationRisk: number;
    overallValue: number;
  };
  analysis: string;
  warnings: string[];
}

export class GuidanceEngine {
  /**
   * Get programme recommendations based on learner profile
   */
  async getRecommendations(profile: LearnerProfile): Promise<RecommendationResult> {
    const allProgrammes = await prisma.programme.findMany({
      where: { isActive: true },
      include: {
        institution: { select: { id: true, name: true, type: true, city: true, province: true } },
        intakes: { where: { isOpen: true } },
      },
    });

    const eligible: Programme[] = [];
    const bestFit: Programme[] = [];
    const nearMiss: Array<Programme & { gap: string[] }> = [];
    const alternatives: Programme[] = [];

    for (const programme of allProgrammes) {
      const check = this.checkEligibility(profile, programme);

      if (check.eligible) {
        eligible.push(programme);
        if (check.score >= 80) {
          bestFit.push(programme);
        }
      } else if (check.nearMiss) {
        nearMiss.push({ ...programme, gap: check.missing });
      }
    }

    // Filter by preferences
    const filtered = eligible.filter((p) => {
      let match = true;
      if (profile.budgetMax && p.tuitionFeeMin && p.tuitionFeeMin > profile.budgetMax) match = false;
      if (profile.studyMode && !p.studyModes.includes(profile.studyMode)) match = false;
      if (profile.province && p.institution.province !== profile.province) match = false;
      return match;
    });

    // Sort best fit by value score
    bestFit.sort((a, b) => (b.overallValueScore || 0) - (a.overallValueScore || 0));

    // Find alternatives in different fields
    if (profile.interests.length > 0) {
      const altProgrammes = allProgrammes.filter(
        (p) =>
          !eligible.includes(p) &&
          !nearMiss.some((nm) => nm.id === p.id) &&
          p.qualificationLevel === 'CERTIFICATE'
      );
      alternatives.push(...altProgrammes.slice(0, 10));
    }

    return {
      eligible: filtered.slice(0, 20),
      bestFit: bestFit.slice(0, 10),
      nearMiss: nearMiss.slice(0, 10),
      alternatives: alternatives.slice(0, 10),
    };
  }

  /**
   * Check eligibility for a specific programme
   */
  checkEligibility(profile: LearnerProfile, programme: any): EligibilityResult {
    const meets: string[] = [];
    const missing: string[] = [];
    let score = 0;
    const maxScore = 100;

    const requirements = programme.entryRequirements as Record<string, any>;
    if (!requirements) {
      return { eligible: true, score: 50, meets: ['No requirements specified'], missing: [], nearMiss: false, improvementSteps: [] };
    }

    // Check education level
    const levelOrder = ['O_LEVEL', 'A_LEVEL', 'CERTIFICATE', 'DIPLOMA', 'DEGREE', 'POSTGRADUATE'];
    const requiredLevel = requirements.minimumLevel || 'O_LEVEL';
    const userLevelIdx = levelOrder.indexOf(profile.educationLevel);
    const reqLevelIdx = levelOrder.indexOf(requiredLevel);

    if (userLevelIdx >= reqLevelIdx) {
      meets.push(`Education level: ${profile.educationLevel}`);
      score += 30;
    } else {
      missing.push(`Requires minimum ${requiredLevel}, you have ${profile.educationLevel}`);
    }

    // Check O-Level results
    const oLevelResults = profile.oLevelResults as Record<string, any> | null;
    if (programme.oLevelMin && oLevelResults) {
      const passes = Object.values(oLevelResults).filter(
        (grade: any) => ['A', 'B', 'C'].includes(String(grade).toUpperCase())
      ).length;

      if (passes >= programme.oLevelMin) {
        meets.push(`O-Level passes: ${passes}/${programme.oLevelMin} required`);
        score += 25;
      } else {
        missing.push(`Need ${programme.oLevelMin} O-Level passes, have ${passes}`);
      }
    } else if (!programme.oLevelMin) {
      score += 25;
    }

    // Check required subjects
    if (programme.requiredSubjects?.length > 0 && oLevelResults) {
      const userSubjects = Object.keys(oLevelResults).map((s) => s.toLowerCase());
      const hasSubjects = programme.requiredSubjects.filter(
        (s: string) => userSubjects.includes(s.toLowerCase())
      );
      const missingSubjects = programme.requiredSubjects.filter(
        (s: string) => !userSubjects.includes(s.toLowerCase())
      );

      if (missingSubjects.length === 0) {
        meets.push(`Required subjects: ${hasSubjects.join(', ')}`);
        score += 25;
      } else {
        missing.push(`Missing required subjects: ${missingSubjects.join(', ')}`);
      }
    } else {
      score += 25;
    }

    // Check A-Level if required
    const aLevelResults = profile.aLevelResults as Record<string, any> | null;
    if (programme.aLevelMin) {
      if (aLevelResults) {
        const passes = Object.values(aLevelResults).filter(
          (grade: any) => ['A', 'B', 'C', 'D', 'E'].includes(String(grade).toUpperCase())
        ).length;

        if (passes >= programme.aLevelMin) {
          meets.push(`A-Level passes: ${passes}/${programme.aLevelMin} required`);
          score += 20;
        } else {
          missing.push(`Need ${programme.aLevelMin} A-Level passes, have ${passes}`);
        }
      } else {
        missing.push(`A-Level results required (${programme.aLevelMin} passes)`);
      }
    } else {
      score += 20;
    }

    const eligible = missing.length === 0;
    const nearMiss = !eligible && missing.length <= 2 && score >= 40;

    const improvementSteps = missing.map((m) => {
      if (m.includes('O-Level passes')) return 'Consider retaking O-Levels to improve your passes';
      if (m.includes('A-Level')) return 'Consider completing A-Levels or an equivalent qualification';
      if (m.includes('subjects')) return 'Look into supplementary exams for the missing subjects';
      if (m.includes('Education level')) return 'Complete the required level of education first';
      return `Address: ${m}`;
    });

    return { eligible, score, meets, missing, nearMiss, improvementSteps };
  }

  /**
   * Find alternative programmes when user doesn't qualify
   */
  async findAlternatives(profile: LearnerProfile, targetProgramme: any): Promise<Programme[]> {
    // Find programmes in similar fields with lower requirements
    const alternatives = await prisma.programme.findMany({
      where: {
        isActive: true,
        id: { not: targetProgramme.id },
        OR: [
          { faculty: targetProgramme.faculty },
          { name: { contains: targetProgramme.name.split(' ')[0], mode: 'insensitive' } },
        ],
        oLevelMin: { lte: targetProgramme.oLevelMin || 5 },
      },
      include: {
        institution: { select: { name: true, type: true, city: true } },
        intakes: { where: { isOpen: true } },
      },
      take: 10,
    });

    return alternatives;
  }

  /**
   * Get value analysis for a programme
   */
  getValueAnalysis(programme: any): ValueAnalysis {
    const scores = {
      demandScore: programme.demandScore || 50,
      remoteOpportunity: programme.remoteOpportunity || 30,
      selfEmployment: programme.selfEmployment || 50,
      capitalRequirement: programme.capitalRequirement || 50,
      timeToIncome: programme.timeToIncome || 50,
      aiAutomationRisk: programme.aiAutomationRisk || 50,
      overallValue: programme.overallValueScore || 50,
    };

    const warnings: string[] = [];
    if (scores.aiAutomationRisk > 70) {
      warnings.push('High AI automation risk: This field may see significant automation in the next 5-10 years. Consider developing complementary skills.');
    }
    if (scores.demandScore < 30) {
      warnings.push('Low local demand: Job opportunities in Zimbabwe for this field are currently limited.');
    }
    if (scores.capitalRequirement > 80) {
      warnings.push('High startup capital needed if pursuing self-employment in this field.');
    }

    let analysis = '';
    if (scores.overallValue >= 70) {
      analysis = 'Strong overall value. This programme offers good prospects for employment and career growth in the current Zimbabwe economy.';
    } else if (scores.overallValue >= 50) {
      analysis = 'Moderate value. This programme has reasonable prospects but consider supplementing with practical skills training.';
    } else {
      analysis = 'Below average value score. Consider exploring alternative programmes or combining this with high-demand skills.';
    }

    if (scores.remoteOpportunity > 60) {
      analysis += ' Good potential for remote/international work opportunities.';
    }
    if (scores.selfEmployment > 60) {
      analysis += ' Strong self-employment potential.';
    }

    return {
      programmeId: programme.id,
      programmeName: programme.name,
      institutionName: programme.institution?.name || 'Unknown',
      scores,
      analysis,
      warnings,
    };
  }
}
