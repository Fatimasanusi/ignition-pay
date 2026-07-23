# Coding Standards

## TypeScript / JavaScript

- Use **TypeScript** for all new code (strict mode enabled)
- Follow the existing ESLint configuration
- Use **functional components** with hooks in React
- Prefer `const` over `let` (avoid `var`)
- Use named exports over default exports
- File names use kebab-case (e.g., `wallet-card.tsx`)

### Naming Conventions

| Construct | Convention | Example |
|-----------|-----------|---------|
| Components | PascalCase | `WalletCard` |
| Functions | camelCase | `formatBalance` |
| Variables | camelCase | `userBalance` |
| Types/Interfaces | PascalCase | `WalletCardProps` |
| Files | kebab-case | `wallet-card.tsx` |
| Directories | kebab-case | `components/ui/` |

### React/Next.js Conventions

- Use `'use client'` directive only where browser APIs are needed
- Server components are preferred when possible
- Props are typed with TypeScript interfaces
- Event handlers use `handle` prefix (e.g., `handleSubmit`)

## Dart / Flutter

- Follow the official Dart style guide
- Use `analysis_options.yaml` conventions
- Prefer `const` constructors where possible
- Use `camelCase` for variables and methods
- Use `PascalCase` for classes and types

## CSS / Styling

- Use Tailwind CSS utility classes primarily
- CSS custom properties for theme values
- Avoid inline styles in production code
- Follow the established color scheme (CSS variables in `globals.css`)

## Git Conventions

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(wallet): add balance hide toggle
fix(api): handle null memo in transaction
docs: update setup guide
```

### Branch Naming

- Feature branches: `feat/<description>`
- Bug fixes: `fix/<description>`
- Documentation: `docs/<description>`
