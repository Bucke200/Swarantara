# Translator App

A modern web application built with React and Vite for text translation.

## Features

- Modern React-based UI
- Fast development with Vite
- Beautiful icons using Lucide React
- Environment variable support

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd trannslatorr
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```env
# Add your environment variables here
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

## Project Structure

```
trannslatorr/
├── src/               # Source files
├── public/           # Static assets
├── index.html        # Entry HTML file
├── package.json      # Project dependencies and scripts
├── vite.config.js    # Vite configuration
└── .env             # Environment variables
```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production

## Technologies Used

- React 18
- Vite
- Lucide React (for icons)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Deployment

**Live Demo:** [https://swarantara-swart.vercel.app/](https://swarantara-8zxyaibf0-ashborns-projects-a91c131f.vercel.app/)

### Deploy on Vercel

1. Push your code to GitHub (e.g., Bucke200/Swarantara).
2. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Log in to Vercel:
   ```bash
   vercel login
   ```
4. From your project root:
   ```bash
   cd c:/projects/Swarantara-master/Swarantara-main
   vercel --prod
   ```
5. Add your environment variable:
   ```bash
   vercel env add VITE_SARVAM_API_KEY production
   ```
