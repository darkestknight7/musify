# Contributing to Musify

Thank you for your interest in contributing to **Musify**!

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/darkestknight7/musify.git
   cd musify
   ```
2. Install backend and frontend dependencies:
   ```bash
   pip install -r requirements.txt
   npm install
   ```
3. Start the backend and frontend dev servers:
   ```bash
   python server.py
   npm run dev
   ```
4. Build for production and verify before submitting a pull request:
   ```bash
   npm run build
   ```

## Pull Request Guidelines
- Keep changes focused and modular.
- Follow the existing React + Tailwind CSS component structure and FastAPI route conventions.
- Test both desktop and mobile/tablet responsive layouts before opening a PR.
