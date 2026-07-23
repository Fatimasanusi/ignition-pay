# Frontend Architecture

## Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS v4 + shadcn/ui (base-nova style)
- **Icons**: Lucide React
- **UI Primitives**: Base UI React

## Directory Structure

```
ignition-pay-frontend/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main dashboard
│   ├── send/               # Send payment flow
│   ├── receive/            # Receive payment flow
│   ├── history/            # Transaction history
│   ├── anchors/            # Anchor management
│   ├── settings/           # User settings
│   └── globals.css         # Global styles / theme variables
├── components/             # Shared React components
│   ├── ui/                 # shadcn/ui primitives
│   ├── wallet-card.tsx     # Wallet overview card
│   ├── asset-card.tsx      # Asset display card
│   ├── transaction-row.tsx # Transaction list row
│   ├── navigation.tsx      # Sidebar / mobile nav
│   └── app-wrapper.tsx     # Root layout wrapper
└── lib/
    ├── utils.ts            # cn() utility
    └── theme.ts            # Theme constants & types
```

## Routing

The app uses Next.js App Router with the following routes:

| Route | Page | Description |
|-------|------|-------------|
| `/` | Redirect | Redirects to `/dashboard` |
| `/dashboard` | DashboardPage | Main wallet overview |
| `/send` | SendPage | Send assets form |
| `/receive` | ReceivePage | Receive address/QR |
| `/history` | HistoryPage | Transaction history |
| `/anchors` | AnchorsPage | Anchor integrations |
| `/settings` | SettingsPage | Account & app settings |

## Component Patterns

- Pages use `'use client'` for interactivity
- Shared components are in `components/`
- UI primitives (button, input, etc.) are in `components/ui/`
- CSS is handled via Tailwind utility classes and CSS custom properties
- The `cn()` utility merges Tailwind classes with `clsx` + `tailwind-merge`

## Theming

- CSS custom properties in `globals.css` define the color palette
- Light and dark modes via `.dark` class on `<html>`
- Theme is toggled by adding/removing the `.dark` class
- All colors use OKLCH color space for perceptually uniform gradients
