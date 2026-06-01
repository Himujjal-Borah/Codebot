import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// Main code review endpoint with execution
app.post('/api/review', async (req, res) => {
  try {
    const { code, language, focusArea } = req.body;

    console.log('📝 Received code review request');
    console.log(`Language: ${language}`);
    console.log(`Code length: ${code?.length} chars`);

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

    console.log('🤖 Calling Gemini API for code review...');

    // Call Google Gemini API for review
    const reviewResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GENAI_API_KEY}`,
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
      reviewResponse.data.candidates &&
      reviewResponse.data.candidates[0] &&
      reviewResponse.data.candidates[0].content &&
      reviewResponse.data.candidates[0].content.parts &&
      reviewResponse.data.candidates[0].content.parts[0]
    ) {
      geminiResponse = reviewResponse.data.candidates[0].content.parts[0].text;
    } else {
      return res.status(500).json({
        error: 'Unexpected response format from Gemini API',
      });
    }

    console.log('✅ Got review from Gemini');

    // Parse JSON response
    let reviewData;
    try {
      reviewData = JSON.parse(geminiResponse);
    } catch (parseError) {
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

    console.log('🎯 Review parsed successfully');

    // Execute code and capture output
    let executionOutput = null;
    let executionError = null;

    if (language === 'javascript') {
      console.log('▶️ Executing JavaScript...');
      try {
        executionOutput = executeJavaScript(code);
        console.log('✅ JavaScript execution successful');
        console.log('Output:', executionOutput);
      } catch (error) {
        executionError = error.message;
        console.error('❌ JavaScript error:', error.message);
      }
    } else if (language === 'python') {
      console.log('▶️ Executing Python...');
      try {
        executionOutput = executePython(code);
        console.log('✅ Python execution successful');
      } catch (error) {
        executionError = error.message;
        console.error('❌ Python error:', error.message);
      }
    }

    console.log('📤 Sending response with execution data');

    // Return both review and output
    const response = {
      ...reviewData,
      execution: {
        output: executionOutput,
        error: executionError,
        language: language,
      },
    };

    console.log('Final response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);

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

// Function to safely execute JavaScript
function executeJavaScript(code) {
  const capturedOutput = [];
  
  const customConsole = {
    log: (...args) => {
      capturedOutput.push(
        args
          .map((arg) => {
            if (typeof arg === 'object') {
              return JSON.stringify(arg, null, 2);
            }
            return String(arg);
          })
          .join(' ')
      );
    },
    error: (...args) => {
      capturedOutput.push('ERROR: ' + args.map(String).join(' '));
    },
    warn: (...args) => {
      capturedOutput.push('WARN: ' + args.map(String).join(' '));
    },
    info: (...args) => {
      capturedOutput.push('INFO: ' + args.map(String).join(' '));
    },
  };

  try {
    // Create a safe function with custom console
    const func = new Function('console', code);
    const result = func(customConsole);

    if (capturedOutput.length === 0) {
      if (result !== undefined) {
        return String(result);
      }
      return 'Code executed successfully (no console output)';
    }
    return capturedOutput.join('\n');
  } catch (error) {
    throw new Error(`JavaScript Error: ${error.message}`);
  }
}

// Function to execute Python
function executePython(code) {
  try {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    const tempDir = require('os').tmpdir();
    const scriptPath = path.join(tempDir, `script_${Date.now()}.py`);

    // Write code to file
    fs.writeFileSync(scriptPath, code, 'utf8');

    // Execute with timeout
    const output = execSync(`python3 "${scriptPath}"`, {
      timeout: 5000, // 5 second timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      encoding: 'utf8',
    });

    // Clean up
    try {
      fs.unlinkSync(scriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }

    if (output.trim() === '') {
      return 'Code executed successfully (no output)';
    }
    return output;
  } catch (error) {
    if (error.signal === 'SIGTERM') {
      throw new Error('Python execution timed out (max 5 seconds)');
    }
    throw new Error(`Python Error: ${error.message}`);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('⚠️ Middleware error:', err);
  res.status(500).json({ error: 'Server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Code Review Bot Backend Started!`);
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📝 Review Code: POST http://localhost:${PORT}/api/review`);
  console.log(`🌐 Supported Languages: JavaScript, Python`);
  console.log(`\n`);
});