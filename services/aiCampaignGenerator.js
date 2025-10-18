import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate Google Ads campaign using persona data and OpenAI
 * @param {Object} persona - The persona object from database
 * @param {Object} options - Additional campaign options (objective, budget, etc.)
 * @returns {Object} Generated campaign data
 */
async function generateGoogleAdsCampaign(persona, options = {}) {
  try {
    const { objective = "awareness", dailyBudget = 20, additionalContext = "" } = options;

    const prompt = `You are an expert Google Ads campaign strategist. Generate a highly targeted Google Ads campaign based on the following persona:

**Persona Name:** ${persona.personaName}
**Demographics:** ${persona.demographics}
**Pain Point:** ${persona.painPoint}
**Desire/Aspiration:** ${persona.desire}
**Motivators:** ${persona.motivators || "Not specified"}
**Barriers:** ${persona.barriers || "Not specified"}
**Tone/Voice:** ${persona.tone}
**Channels:** ${persona.channels}
**Journey Stage:** ${persona.primaryStage}

**Campaign Objective:** ${objective}
**Daily Budget:** $${dailyBudget}
${additionalContext ? `**Additional Context:** ${additionalContext}` : ""}

Generate a complete Google Ads campaign with the following structure:

1. Campaign Name (compelling, clear, max 60 chars)
2. 3-5 high-intent keywords (based on pain point and desire)
3. 2-3 negative keywords (to filter out irrelevant searches)
4. Ad Group Name
5. 3 Ad Headlines (max 30 chars each, speak to pain/desire in persona's tone)
6. 2 Ad Descriptions (max 90 chars each, clear value prop + CTA)
7. Final URL suggestion (landing page focus)
8. Call to Action recommendation

Return your response in valid JSON format with this exact structure:
{
  "campaignName": "string",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "negativeKeywords": ["neg1", "neg2"],
  "adGroupName": "string",
  "headlines": ["headline1", "headline2", "headline3"],
  "descriptions": ["desc1", "desc2"],
  "finalUrl": "string (placeholder URL is fine)",
  "callToAction": "string",
  "targetingRecommendations": {
    "locations": ["location suggestions"],
    "ageRanges": ["age range suggestions"],
    "genders": ["gender suggestions if relevant"]
  },
  "reasoning": "Brief explanation of strategy"
}`;

    console.log("🤖 Calling OpenAI to generate campaign...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert Google Ads strategist who creates high-converting campaigns. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
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

    console.log("✅ AI campaign generated successfully");
    return {
      success: true,
      campaign: jsonResponse,
      tokensUsed: completion.usage.total_tokens
    };
  } catch (error) {
    console.error("❌ Error generating AI campaign:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate challenge content based on persona
 * @param {Object} persona - The persona object
 * @returns {Object} Generated challenge
 */
async function generateChallenge(persona) {
  try {
    const prompt = `You are a community engagement expert. Create a compelling week-long challenge based on this persona:

**Persona:** ${persona.personaName}
**Pain Point:** ${persona.painPoint}
**Desire:** ${persona.desire}
**Tone:** ${persona.tone}

Generate a challenge in JSON format:
{
  "challengeName": "string (catchy, max 40 chars)",
  "duration": "string (e.g., '7 days', '30 days')",
  "description": "string (2-3 sentences)",
  "rules": ["rule1", "rule2", "rule3", "rule4"],
  "copyText": "string (social media post to announce it, with emojis)"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a community engagement expert. Return valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 800
    });

    const responseText = completion.choices[0].message.content.trim();
    let jsonResponse;
    
    if (responseText.startsWith("```")) {
      const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      jsonResponse = JSON.parse(jsonMatch ? jsonMatch[1] : responseText);
    } else {
      jsonResponse = JSON.parse(responseText);
    }

    return {
      success: true,
      challenge: jsonResponse,
      tokensUsed: completion.usage.total_tokens
    };
  } catch (error) {
    console.error("❌ Error generating challenge:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate email campaign content based on persona
 * @param {Object} persona - The persona object
 * @param {string} emailType - Type of email (weekly_checkin, challenge_launch, etc.)
 * @returns {Object} Generated email
 */
async function generateEmailCampaign(persona, emailType = "weekly_checkin") {
  try {
    const prompt = `Create a compelling email for this persona:

**Persona:** ${persona.personaName}
**Pain Point:** ${persona.painPoint}
**Desire:** ${persona.desire}
**Tone:** ${persona.tone}
**Email Type:** ${emailType}

Generate in JSON format:
{
  "subject": "string (compelling, max 60 chars)",
  "previewText": "string (max 100 chars)",
  "body": "string (email body in plain text, 150-250 words)",
  "ctaText": "string (button text)",
  "ctaUrl": "string (placeholder URL)"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an email copywriting expert. Return valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content.trim();
    let jsonResponse;
    
    if (responseText.startsWith("```")) {
      const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      jsonResponse = JSON.parse(jsonMatch ? jsonMatch[1] : responseText);
    } else {
      jsonResponse = JSON.parse(responseText);
    }

    return {
      success: true,
      email: jsonResponse,
      tokensUsed: completion.usage.total_tokens
    };
  } catch (error) {
    console.error("❌ Error generating email:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export {
  generateGoogleAdsCampaign,
  generateChallenge,
  generateEmailCampaign
};

