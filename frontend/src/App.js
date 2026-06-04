import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [focusArea, setFocusArea] = useState('all');
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReview = async () => {
    setError('');
    setReview(null);

    if (!code || !code.trim()) {
      setError('Please paste some code to review');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('https://codebot-ddg7.onrender.com', {
        code: code.trim(),
        language,
        focusArea,
      });

      console.log('Full response:', response.data);
      setReview(response.data);
    } catch (err) {
      console.error('Error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to review code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#dc2626',
      high: '#f97316',
      medium: '#eab308',
      low: '#06b6d4',
    };
    return colors[severity] || '#6c757d';
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🤖 Code Review Bot</h1>
        <p>Get intelligent code reviews in seconds</p>
      </header>

      <div className="container">
        <div className="input-section">
          <div className="controls">
            <div className="control-group">
              <label>Select Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div className="control-group">
              <label>Review Focus</label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
              >
                <option value="all">All (Bugs, Security, Performance)</option>
                <option value="security">Security Issues Only</option>
                <option value="performance">Performance Only</option>
                <option value="quality">Code Quality Only</option>
              </select>
            </div>
          </div>

          <div className="code-input-group">
            <label>Paste Your Code</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`// Paste your ${language} code here...\nfunction example() {\n  console.log('Hello');\n}`}
              className="code-textarea"
            />
          </div>

          <button
            onClick={handleReview}
            disabled={loading || !code.trim()}
            className="review-button"
          >
            {loading ? '⏳ Reviewing...' : '🔍 Review Code'}
          </button>

          {error && <div className="error-message">{error}</div>}
        </div>

        {review && (
          <div className="review-section">
            <div className="review-header">
              <h2>📊 Review Results</h2>
              <div className="score-badge">
                <span className="label">Code Score</span>
                <span className="score">{review.overallScore || 75}/100</span>
              </div>
            </div>

            <div className="summary-box">
              <p>{review.summary || 'Code review completed.'}</p>
            </div>

            {/* CODE EXECUTION OUTPUT - IMPORTANT */}
            {review.execution && (
              <div className={`execution-section ${review.execution.error ? 'error' : 'success'}`}>
                <h3>⚡ Code Execution Output</h3>
                <div className="execution-output">
                  {review.execution.error ? (
                    <>
                      <strong>❌ Error:</strong>
                      <pre>{review.execution.error}</pre>
                    </>
                  ) : (
                    <>
                      <strong>✅ Output:</strong>
                      <pre>{review.execution.output || '(No output)'}</pre>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Issues */}
            {review.issues && review.issues.length > 0 && (
              <div className="issues-section">
                <h3>⚠️ Issues Found ({review.issues.length})</h3>
                {review.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="issue-card"
                    style={{ borderLeftColor: getSeverityColor(issue.severity) }}
                  >
                    <div className="issue-header">
                      <h4>{issue.title}</h4>
                      <div className="issue-meta">
                        <span
                          className="type-badge"
                          style={{ backgroundColor: getSeverityColor(issue.severity) }}
                        >
                          {issue.type}
                        </span>
                        <span className="severity-badge">{issue.severity}</span>
                      </div>
                    </div>
                    <p className="issue-description">{issue.description}</p>
                    {issue.suggestion && (
                      <div className="suggestion-box">
                        <strong>💡 Fix:</strong>
                        <code>{issue.suggestion}</code>
                        <button
                          onClick={() => handleCopyCode(issue.suggestion)}
                          className="copy-button"
                        >
                          📋 Copy
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Strengths */}
            {review.strengths && review.strengths.length > 0 && (
              <div className="strengths-section">
                <h3>✅ Strengths</h3>
                <ul>
                  {review.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {review.improvements && review.improvements.length > 0 && (
              <div className="improvements-section">
                <h3>💡 Suggested Improvements</h3>
                <ul>
                  {review.improvements.map((improvement, idx) => (
                    <li key={idx}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}

            {(!review.issues || review.issues.length === 0) && (
              <div className="no-issues">
                <p>✨ Great! No major issues found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;