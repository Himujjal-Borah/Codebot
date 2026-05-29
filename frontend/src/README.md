# 🤖 Code Review Bot


## Features

✅ **Instant Code Reviews** - Get detailed feedback on your code  
✅ **Multiple Languages** - JavaScript, Python, Java, Go, Rust, SQL, and more  
✅ **Smart Analysis** - Detects bugs, security issues, performance problems, and code quality  
✅ **Free to Use** - Uses Google Gemini free tier API  
✅ **Beautiful UI** - Modern, responsive interface built with React  

## Tech Stack

- **Frontend:** React, Axios, CSS
- **Backend:** Node.js, Express
- **AI Engine:** Google Gemini API
- **Database:** None (stateless)

## Installation

### Prerequisites
- Node.js (v14+)
- npm
- Google Gemini API Key (free at https://ai.google.dev/)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/YOUR-USERNAME/code-review-bot.git
cd code-review-bot
```

2. Setup Backend:
```bash
cd backend
npm install
```

3. Create `.env` file in backend folder:

GENAI_API_KEY=your-api-key-here
PORT=5000

4. Start Backend:
```bash
node server.js
```

5. Setup Frontend (in new terminal):
```bash
cd frontend
npm install
npm start
```

6. Open browser: http://localhost:3000

## Usage

1. Select a programming language
2. Choose review focus (all, security, performance, quality)
3. Paste your code
4. Click "Review Code"
5. Get detailed feedback instantly!

## Project Structure



## API Endpoints

- `GET /api/health` - Health check
- `POST /api/review` - Review code

## License

MIT

## Author

[Himujjal Borah

## Support

Need help? Open an issue on GitHub!