# City Taxi Leskovac

Taxi Pro App - Your reliable taxi service in Leskovac.

## Features

- Built with Angular 17
- Standalone components architecture
- Integrated with Vercel Web Analytics for visitor tracking and page view analytics

## Development

### Prerequisites

- Node.js (v18 or later)
- npm, yarn, pnpm, or bun

### Installation

Install dependencies:

```bash
npm install
```

### Development Server

Run the development server:

```bash
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build

Build the project:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Running Tests

Run unit tests:

```bash
npm test
```

### Linting

Run the linter:

```bash
npm run lint
```

## Vercel Web Analytics

This project includes Vercel Web Analytics integration. The analytics tracking is implemented in `src/main.ts` using the `inject()` function from `@vercel/analytics`.

### How it works

- The `@vercel/analytics` package is automatically installed with the project dependencies
- Analytics tracking is initialized in the main entry point (`src/main.ts`)
- Once deployed to Vercel, the app will track visitor data and page views
- View analytics data in your Vercel dashboard under the Analytics tab

### Enable Analytics on Vercel

1. Go to your [Vercel dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click the **Analytics** tab
4. Click **Enable** to activate Web Analytics

After deployment, you'll be able to see analytics data including:
- Page views
- Visitor statistics
- Custom events (if configured)

## Deployment

Deploy to Vercel:

```bash
vercel deploy
```

Or connect your Git repository to Vercel for automatic deployments.

## Learn More

- [Angular Documentation](https://angular.io/docs)
- [Vercel Web Analytics Documentation](https://vercel.com/docs/analytics)

## License

All rights reserved © 2026 City Taxi Leskovac
