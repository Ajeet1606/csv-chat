# CSV Chat

An AI-powered CSV analysis tool that generates and executes Python code in a sandboxed environment to answer questions about your data.

## Features

- 📊 Upload CSV files and chat with your data
- 🤖 AI-powered Python code generation using local LLM (Ollama)
- 🐳 Secure sandboxed code execution using Docker containers
- ⚡ Real-time data analysis with pandas/numpy
- 🎨 Modern UI with dark mode support

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)

2. **pnpm** (package manager)
   ```bash
   npm install -g pnpm
   ```

3. **Docker Desktop** (required for code execution)
   - **macOS**: Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - **Linux**: Install Docker Engine via your package manager
   - Verify installation:
     ```bash
     docker --version
     ```

4. **Ollama** (local LLM server)
   - **macOS**: 
     ```bash
     brew install ollama
     ```
   - **Linux**: 
     ```bash
     curl -fsSL https://ollama.com/install.sh | sh
     ```
   - Start Ollama and download the Mistral model:
     ```bash
     ollama serve  # Keep this running in a separate terminal
     ollama pull mistral
     ```

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd csv-chat
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Build the Python sandbox Docker image**
   
   This step is **required** before running the app. The sandbox image is used to execute generated Python code securely:
   
   ```bash
   docker-compose build python-sandbox
   ```
   
   Verify the image was created:
   ```bash
   docker images | grep csv-chat-python-sandbox
   ```

4. **Start Ollama** (if not already running)
   ```bash
   ollama serve
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Upload**: Upload a CSV file through the web interface
2. **Analyze**: The app extracts metadata (columns, types, sample data)
3. **Chat**: Ask questions about your data in natural language
4. **Generate**: Local LLM (Mistral via Ollama) generates Python code
5. **Execute**: Code runs in an isolated Docker container with:
   - 512MB memory limit
   - 1 CPU core limit
   - No network access
   - Read-only CSV file access
   - 30-second timeout
6. **Results**: Parsed JSON results displayed in the UI

## Architecture

- **Frontend**: Next.js 16 with React 19
- **Styling**: Tailwind CSS v4
- **LLM**: Ollama (Mistral model) via OpenAI-compatible API
- **Code Execution**: Dockerode + Python 3.11 sandbox
- **Data Processing**: pandas + numpy

## Security

The Python execution environment is highly restricted:

- Runs in isolated Docker containers
- No network access (`NetworkMode: 'none'`)
- Read-only file system access
- Memory and CPU limits enforced
- Non-root user execution
- 30-second execution timeout
- Limited libraries (only pandas, numpy, json)

## Troubleshooting

### Docker image not found
```bash
docker-compose build python-sandbox
```

### Ollama connection refused
Ensure Ollama is running:
```bash
ollama serve
```

### Mistral model not found
Download the model:
```bash
ollama pull mistral
```

### Port 3000 already in use
Change the port in `package.json` or stop the conflicting process.

## Development

```bash
# Run in development mode with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Project Structure

```
csv-chat/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   │   ├── chat/     # Chat endpoint (code gen + execution)
│   │   │   └── upload/   # CSV upload endpoint
│   │   └── chat/         # Chat interface page
│   ├── components/       # React components
│   ├── lib/              # Core services
│   │   ├── csv-service.ts      # CSV parsing & metadata
│   │   ├── llm-service.ts      # Ollama/LLM integration
│   │   └── python-executor.ts  # Docker sandbox execution
├── data/
│   ├── uploads/          # Uploaded CSV files
│   └── datasets-metadata.json  # Dataset registry
├── docker/
│   └── python-sandbox/   # Sandbox Dockerfile
└── docker-compose.yml    # Docker image build config
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Ollama Documentation](https://ollama.com/docs)
- [Docker Documentation](https://docs.docker.com/)

## License

MIT

