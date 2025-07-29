# Padel Tournament Manager

A React-based application for managing padel tournaments with an intuitive interface built using Vite and Tailwind CSS.

## Features

- Tournament management
- Player registration and tracking
- Match scheduling and results
- Local storage for data persistence

## Development

### Prerequisites

- Node.js (version 18 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/padel-tournment.git
cd padel-tournment

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to GitHub Pages (manual deployment)

## Deployment

This project is configured for automatic deployment to GitHub Pages.

### Automatic Deployment

The project will automatically deploy to GitHub Pages when you push to the `master` branch, thanks to the included GitHub Actions workflow.

### Manual Deployment

You can also deploy manually using:

```bash
npm run deploy
```

### GitHub Pages Setup

1. Go to your repository's Settings
2. Navigate to "Pages" in the sidebar
3. Under "Source", select "GitHub Actions"
4. The site will be available at: `https://YOUR_USERNAME.github.io/padel-tournment/`

### First-time Setup

After setting up the repository:

1. Make sure your repository name matches the `base` path in `vite.config.js`
2. If your repository has a different name, update the `base` configuration
3. Push your code to the `master` branch
4. Enable GitHub Pages in your repository settings

## Technology Stack

- **React 19** - Frontend framework
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **ESLint** - Code linting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
