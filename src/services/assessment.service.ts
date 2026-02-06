interface Question {
  id: string;
  category: 'verbal' | 'numerical' | 'logical' | 'creative' | 'practical' | 'social' | 'interest';
  text: string;
  options: { label: string; value: number; trait?: string }[];
}

interface AssessmentResponse {
  questionId: string;
  answer: number;
}

interface AssessmentResult {
  verbal: number;
  numerical: number;
  logical: number;
  creative: number;
  practical: number;
  social: number;
  topStrengths: string[];
  suggestedFields: string[];
  summary: string;
}

export class AssessmentEngine {
  private questions: Question[] = [
    // Verbal
    {
      id: 'v1',
      category: 'verbal',
      text: 'How comfortable are you explaining complex ideas to others?',
      options: [
        { label: 'Very comfortable', value: 5 },
        { label: 'Somewhat comfortable', value: 3 },
        { label: 'Not very comfortable', value: 1 },
      ],
    },
    {
      id: 'v2',
      category: 'verbal',
      text: 'Do you enjoy reading, writing, or debating?',
      options: [
        { label: 'Very much', value: 5 },
        { label: 'Sometimes', value: 3 },
        { label: 'Not really', value: 1 },
      ],
    },
    {
      id: 'v3',
      category: 'verbal',
      text: 'How easily can you learn new languages or pick up new vocabulary?',
      options: [
        { label: 'Very easily', value: 5 },
        { label: 'With some effort', value: 3 },
        { label: 'It is difficult for me', value: 1 },
      ],
    },
    // Numerical
    {
      id: 'n1',
      category: 'numerical',
      text: 'How do you feel about solving mathematical problems?',
      options: [
        { label: 'I enjoy it', value: 5 },
        { label: 'I can manage', value: 3 },
        { label: 'I avoid it', value: 1 },
      ],
    },
    {
      id: 'n2',
      category: 'numerical',
      text: 'Are you good at estimating quantities, distances, or budgets?',
      options: [
        { label: 'Yes, very accurate', value: 5 },
        { label: 'Fairly good', value: 3 },
        { label: 'Not at all', value: 1 },
      ],
    },
    {
      id: 'n3',
      category: 'numerical',
      text: 'Do you enjoy working with data, graphs, or statistics?',
      options: [
        { label: 'Very much', value: 5 },
        { label: 'Somewhat', value: 3 },
        { label: 'Not really', value: 1 },
      ],
    },
    // Logical
    {
      id: 'l1',
      category: 'logical',
      text: 'Do you enjoy solving puzzles, strategy games, or brain teasers?',
      options: [
        { label: 'Love them', value: 5 },
        { label: 'Sometimes', value: 3 },
        { label: 'Not interested', value: 1 },
      ],
    },
    {
      id: 'l2',
      category: 'logical',
      text: 'When faced with a problem, do you naturally break it into smaller steps?',
      options: [
        { label: 'Always', value: 5 },
        { label: 'Sometimes', value: 3 },
        { label: 'Rarely', value: 1 },
      ],
    },
    {
      id: 'l3',
      category: 'logical',
      text: 'How interested are you in technology and how things work?',
      options: [
        { label: 'Very interested', value: 5 },
        { label: 'Somewhat', value: 3 },
        { label: 'Not much', value: 1 },
      ],
    },
    // Creative
    {
      id: 'c1',
      category: 'creative',
      text: 'Do you enjoy drawing, designing, music, or other creative activities?',
      options: [
        { label: 'Very much', value: 5 },
        { label: 'Sometimes', value: 3 },
        { label: 'Not really', value: 1 },
      ],
    },
    {
      id: 'c2',
      category: 'creative',
      text: 'Do you come up with original ideas or solutions often?',
      options: [
        { label: 'Frequently', value: 5 },
        { label: 'Occasionally', value: 3 },
        { label: 'Rarely', value: 1 },
      ],
    },
    // Practical
    {
      id: 'p1',
      category: 'practical',
      text: 'Do you prefer hands-on work over desk-based work?',
      options: [
        { label: 'Definitely hands-on', value: 5 },
        { label: 'Both are fine', value: 3 },
        { label: 'Prefer desk work', value: 1 },
      ],
    },
    {
      id: 'p2',
      category: 'practical',
      text: 'Are you good at building, fixing, or making things?',
      options: [
        { label: 'Very good', value: 5 },
        { label: 'Average', value: 3 },
        { label: 'Not really', value: 1 },
      ],
    },
    {
      id: 'p3',
      category: 'practical',
      text: 'Do you enjoy gardening, farming, or working outdoors?',
      options: [
        { label: 'Very much', value: 5 },
        { label: 'Sometimes', value: 3 },
        { label: 'Not at all', value: 1 },
      ],
    },
    // Social
    {
      id: 's1',
      category: 'social',
      text: 'Do you enjoy working with people, helping, or leading groups?',
      options: [
        { label: 'Very much', value: 5 },
        { label: 'Sometimes', value: 3 },
        { label: 'I prefer working alone', value: 1 },
      ],
    },
    {
      id: 's2',
      category: 'social',
      text: 'Are you interested in careers that involve caring for others (health, social work, teaching)?',
      options: [
        { label: 'Very interested', value: 5 },
        { label: 'Somewhat', value: 3 },
        { label: 'Not really', value: 1 },
      ],
    },
    // Interest-based
    {
      id: 'i1',
      category: 'interest',
      text: 'Which area interests you most?',
      options: [
        { label: 'Business & Commerce', value: 1, trait: 'business' },
        { label: 'Science & Technology', value: 2, trait: 'science' },
        { label: 'Arts & Humanities', value: 3, trait: 'arts' },
        { label: 'Health & Medicine', value: 4, trait: 'health' },
        { label: 'Agriculture & Environment', value: 5, trait: 'agriculture' },
        { label: 'Engineering & Construction', value: 6, trait: 'engineering' },
      ],
    },
    {
      id: 'i2',
      category: 'interest',
      text: 'What do you value most in a career?',
      options: [
        { label: 'High income potential', value: 1, trait: 'income' },
        { label: 'Helping others', value: 2, trait: 'service' },
        { label: 'Being my own boss', value: 3, trait: 'entrepreneurship' },
        { label: 'Job security', value: 4, trait: 'stability' },
        { label: 'Working internationally', value: 5, trait: 'global' },
      ],
    },
    {
      id: 'i3',
      category: 'interest',
      text: 'How important is it that your career is resistant to AI automation?',
      options: [
        { label: 'Very important', value: 5 },
        { label: 'Somewhat important', value: 3 },
        { label: 'Not important', value: 1 },
      ],
    },
  ];

  getQuestions(): Question[] {
    return this.questions;
  }

  evaluate(responses: AssessmentResponse[]): AssessmentResult {
    const scores: Record<string, number[]> = {
      verbal: [],
      numerical: [],
      logical: [],
      creative: [],
      practical: [],
      social: [],
    };

    const interests: string[] = [];

    for (const response of responses) {
      const question = this.questions.find((q) => q.id === response.questionId);
      if (!question) continue;

      if (question.category === 'interest') {
        const option = question.options.find((o) => o.value === response.answer);
        if (option?.trait) interests.push(option.trait);
      } else {
        scores[question.category]?.push(response.answer);
      }
    }

    const avg = (arr: number[]): number =>
      arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 20) : 50;

    const result = {
      verbal: avg(scores.verbal),
      numerical: avg(scores.numerical),
      logical: avg(scores.logical),
      creative: avg(scores.creative),
      practical: avg(scores.practical),
      social: avg(scores.social),
    };

    // Determine top strengths
    const sorted = Object.entries(result)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    const topStrengths = sorted.map(([key]) => key);

    // Map to suggested fields
    const fieldMap: Record<string, string[]> = {
      verbal: ['Law', 'Journalism', 'Teaching', 'Public Relations', 'Translation'],
      numerical: ['Accounting', 'Finance', 'Data Science', 'Actuarial Science', 'Economics'],
      logical: ['Computer Science', 'Engineering', 'Information Technology', 'Mathematics', 'Research'],
      creative: ['Graphic Design', 'Architecture', 'Media Studies', 'Marketing', 'Fine Arts'],
      practical: ['Agriculture', 'Mining Engineering', 'Automotive', 'Construction', 'Electrical Engineering'],
      social: ['Nursing', 'Social Work', 'Psychology', 'Human Resources', 'Community Development'],
    };

    const suggestedFields = [
      ...new Set(topStrengths.flatMap((s) => fieldMap[s] || [])),
    ].slice(0, 8);

    // Add interest-based suggestions
    const interestFields: Record<string, string[]> = {
      business: ['Business Management', 'Marketing', 'Accounting'],
      science: ['Computer Science', 'Biotechnology', 'Laboratory Science'],
      arts: ['Fine Arts', 'Media Studies', 'Creative Writing'],
      health: ['Nursing', 'Pharmacy', 'Public Health'],
      agriculture: ['Agricultural Science', 'Horticulture', 'Forestry'],
      engineering: ['Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering'],
    };

    for (const interest of interests) {
      const fields = interestFields[interest];
      if (fields) suggestedFields.push(...fields);
    }

    const uniqueFields = [...new Set(suggestedFields)].slice(0, 10);

    const summary = `Your strongest areas are ${topStrengths.join(', ')}. ` +
      `Based on your strengths and interests, you may be well-suited for fields like ${uniqueFields.slice(0, 4).join(', ')}. ` +
      `Remember, these are starting points for exploration — your career path is shaped by your effort and choices.`;

    return {
      ...result,
      topStrengths,
      suggestedFields: uniqueFields,
      summary,
    };
  }
}
