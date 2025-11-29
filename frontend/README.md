# Frontend Setup

## Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

### Required Variables

- `VITE_API_URL`: Backend API URL (default: http://localhost:3000)

**Note:** In Vite, environment variables must be prefixed with `VITE_` to be accessible in the browser.

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The built files will be in the `dist` folder.
