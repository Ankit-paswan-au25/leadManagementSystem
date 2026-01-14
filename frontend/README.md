# Sales Management System - Frontend

React frontend application built with Vite, TypeScript, and Tailwind CSS.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for routing
- **Jest + React Testing Library** for testing
- **MSW** for API mocking

## Project Structure

```
src/
 ├─ app/              # App configuration and providers
 ├─ components/       # Reusable components
 │   ├─ ui/          # Basic UI components (Button, Card, Loader)
 │   ├─ alerts/      # Alert components (Success, Info, Error)
 │   └─ modal/       # Modal components (AppModal, ConfirmModal)
 ├─ theme/           # Theme configuration (colors, typography)
 ├─ hooks/           # Custom React hooks
 ├─ services/        # API services
 ├─ store/           # State management
 ├─ styles/          # Global styles
 └─ tests/           # Test files
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Features

- ✅ Light/Dark theme support
- ✅ Design system with tokens
- ✅ Custom alert components
- ✅ Modal infrastructure
- ✅ TypeScript support
- ✅ Testing infrastructure

## Theme System

The app includes a comprehensive theme system with:
- Color tokens for light and dark modes
- Typography configuration
- Theme context provider for easy theme switching

Use the `useTheme` hook to access theme functionality:

```tsx
import { useTheme } from '../app/Providers';

const { theme, mode, toggleTheme } = useTheme();
```

