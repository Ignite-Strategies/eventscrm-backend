import OpenAI from 'openai';

// Lazy initialization
let openai = null;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured. Set environment variable to use AI features.');
  }
  
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  return openai;
};

/**
 * Reverse engineer what someone would search for based on their pain point and demographics
 * @param {Object} personaData - Demographics, pain, desire, etc.
 * @returns {Object} Search questions and keywords
 */
async function reverseEngineerSearches(personaData) {
  try {
    const client = getOpenAIClient();
    
    const { demographics, ageRange, location, painPoint, emotionalState, desire } = personaData;

    const prompt = `You are a search behavior analyst and SEO expert. Someone with the following characteristics is experiencing a pain point and wants a solution. Reverse engineer what they would ACTUALLY type into Google when they're looking for help.

**WHO THEY ARE:**
- Demographics: ${demographics}
- Age Range: ${ageRange}
- Location: ${location}

**THEIR PAIN:**
- Core Pain Point: ${painPoint}
- Emotional State: ${emotionalState}

**WHAT THEY WANT:**
- Desire: ${desire}

Based on this, generate what they would search for on Google. Think about:
1. What questions they'd ask when they're frustrated
2. The exact language they'd use (not corporate speak)
3. Local searches if location matters
4. Both problem-focused and solution-focused searches

Return ONLY valid JSON with this structure:
{
  "searchQuestions": [
    "4-6 question-based searches they'd type",
    "Use natural language, not SEO keywords"
  ],
  "searchKeywords": [
    "5-8 short keyword phrases (2-4 words)",
    "Mix of pain-focused and solution-focused"
  ],
  "reasoning": "1-2 sentence explanation of your search strategy"
}`;

    console.log("🤖 Calling OpenAI to reverse engineer searches...");

    const completion = await client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert in search behavior and user intent. You understand what real people type into Google when they have problems. Return ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8, // Higher creativity for natural language
      max_tokens: 800
    });

    const responseText = completion.choices[0].message.content.trim();
    
    // Parse JSON response (handle markdown code blocks if present)
    let jsonResponse;
    if (responseText.startsWith("```")) {
      const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      jsonResponse = JSON.parse(jsonMatch ? jsonMatch[1] : responseText);
    } else {
      jsonResponse = JSON.parse(responseText);
    }

    console.log("✅ Search reverse engineering complete");
    return {
      success: true,
      data: jsonResponse,
      tokensUsed: completion.usage.total_tokens
    };
    
  } catch (error) {
    console.error("❌ Error reverse engineering searches:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export { reverseEngineerSearches };

