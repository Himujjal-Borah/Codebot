import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// Main code review endpoint
app.post('/api/review', async (req, res) => {
  try {
    const { code, language, focusArea } = req.body;

    // Validate input
    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: 'Code cannot be empty' });
    }

    if (code.length > 10000) {
      return res.status(400).json({ error: 'Code too long (max 10000 chars)' });
    }

    // Build the prompt based on focus area
    let focusInstructions = '';
    if (focusArea === 'security') {
      focusInstructions = 'Focus ONLY on security vulnerabilities and potential exploits.';
    } else if (focusArea === 'performance') {
      focusInstructions = 'Focus ONLY on performance issues and optimization opportunities.';
    } else if (focusArea === 'quality') {
      focusInstructions = 'Focus ONLY on code quality, readability, and maintainability.';
    }

    const prompt = `You are an expert code reviewer. Review the provided ${language || 'code'} code and provide detailed feedback in JSON format.

${focusInstructions || 'Consider bugs, security issues, performance problems, and best practices.'}

You MUST respond ONLY with valid JSON (no markdown, no code blocks, no explanations).
Do not include \`\`\`json or any other formatting.

Code to review:
\`\`\`${language}
${code}
\`\`\`

JSON format:
{
  "summary": "2-3 sentence overview of the code",
  "overallScore": 0-100,
  "issues": [
    {
      "type": "bug|security|performance|quality",
      "severity": "critical|high|medium|low",
      "title": "Issue title",
      "description": "Detailed explanation",
      "line": "estimated line number or 'N/A'",
      "suggestion": "How to fix it"
    }
  ],
  "strengths": ["What the code does well"],
  "improvements": ["General improvement suggestions"]
}`;

    // Call Google Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GENAI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract text from Google Gemini response
    let geminiResponse = '';
    if (
      response.data.candidates &&
      response.data.candidates[0] &&
      response.data.candidates[0].content &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts[0]
    ) {
      geminiResponse = response.data.candidates[0].content.parts[0].text;
    } else {
      return res.status(500).json({
        error: 'Unexpected response format from Gemini API',
      });
    }

    // Parse JSON response
    let reviewData;
    try {
      reviewData = JSON.parse(geminiResponse);
    } catch (parseError) {
      // Try to extract JSON if Gemini wrapped it
      const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reviewData = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(500).json({
          error: 'Failed to parse AI response',
          raw: geminiResponse,
        });
      }
    }

    res.json(reviewData);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);

    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({
        error: 'Invalid API key. Check your GENAI_API_KEY in .env',
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait a moment and try again.',
      });
    }

    res.status(500).json({
      error: error.message || 'An error occurred while reviewing code',
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   API Health: http://localhost:${PORT}/api/health`);
  console.log(`   Review Code: POST http://localhost:${PORT}/api/review`);
});