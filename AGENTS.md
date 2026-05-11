# HaulPass — Architecture Reference

HaulPass is a React Native mobile marketplace for furniture delivery. Two user roles: **Buyer** (requests hauls) and **Pass Pro** (fulfills hauls). This document is the authoritative reference for all agents and developers building on this codebase.

---

## Tech Stack

| Layer | Technology | Rule |
|---|---|---|
| Language | TypeScript 5 (strict) | No `any`. No `as unknown`. |
| Framework | Expo 55 + React 19 | |
| Routing | Expo Router (file-based) | |
| Styling | Tailwind v4 (UniWind) + GlueStack v5 alpha | `className` only. No `StyleSheet.create`. |
| Server state | TanStack Query v5 | All API/Supabase data fetching |
| Client state | Zustand | Auth role, location, transient UI state |
| Backend | Supabase | `@supabase/supabase-js` |
| Platform | React Native (iOS + Android) | No web output. No `.web.tsx` files. |

---

## Directory Structure

```
app/
  _layout.tsx                  # Root: GluestackUIProvider, QueryClientProvider, GestureHandlerRootView
  index.tsx                    # Redirect → (auth) or (buyer)/(pro) based on auth state
  (auth)/
    _layout.tsx                # Stack navigator, no header
    login.tsx
    onboarding.tsx             # Role selection (buyer | pro)
    location.tsx               # GPS-powered service area setup
  (buyer)/
    _layout.tsx                # Tab navigator (index, request, account)
    index.tsx                  # Buyer dashboard — active hauls
    request.tsx                # New haul request form
    payment.tsx                # Cost breakdown + checkout
    account.tsx
  (pro)/
    _layout.tsx                # Tab navigator (index, earnings, account)
    index.tsx                  # Available job requests
    earnings.tsx
    account.tsx
  haul/
    [id].tsx                   # Active haul tracking (buyer real-time view)
  job/
    [id]/
      index.tsx                # Job details — privacy map, payout
      active.tsx               # Active job in-transit (pro view)

components/
  ui/                          # GlueStack primitive wrappers and custom base components
    button/
      index.tsx
    gluestack-ui-provider/
      index.tsx
  features/                    # Feature-scoped, not reusable across features
    auth/
    buyer/
    pro/
    shared/                    # Cross-feature (e.g. HaulCard, UserAvatar)

stores/
  auth.store.ts                # role: "buyer" | "pro" | null, session, userName, location
  haul.store.ts                # activeHauls, pendingHaul
  job.store.ts                 # availableJobs, activeJob

services/
  supabase.ts                  # Supabase client singleton (export: supabase)
  auth.service.ts
  haul.service.ts
  job.service.ts

hooks/
  use-color-scheme.ts
  use-auth.ts                  # Typed selector over auth.store
  use-supabase.ts              # Typed Supabase client hook

types/
  auth.types.ts
  haul.types.ts
  job.types.ts
  user.types.ts
  database.types.ts            # Generated via: supabase gen types typescript

lib/
  query-client.ts              # TanStack Query client (staleTime, gcTime defaults)

constants/
  theme.ts                     # Color and font tokens
  routes.ts                    # Typed route path constants
```

---

## Routing

Expo Router file-based routing. Groups are prefixed with `(name)/` and do not appear in the URL path.

```
/              → app/index.tsx           (auth guard redirect)
/(auth)/login  → app/(auth)/login.tsx
/(buyer)       → app/(buyer)/index.tsx   (tab: dashboard)
/(pro)         → app/(pro)/index.tsx     (tab: job requests)
/haul/abc123   → app/haul/[id].tsx
/job/abc123    → app/job/[id]/index.tsx
```

**Root layout** (`app/_layout.tsx`) wraps the entire app in:
1. `GestureHandlerRootView`
2. `SafeAreaListener` (Uniwind inset tracking)
3. `GluestackUIProvider`
4. `QueryClientProvider` (TanStack Query)

**Auth redirect** (`app/index.tsx`) reads `useAuthStore` and pushes to `/(auth)/login` or the appropriate role group.

---

## Styling

### Rules

- **Always use GlueStack components** as the base. Never use raw `<View>`, `<Text>`, `<Pressable>` directly in screens or feature components.
- **Always style with `className`**. Never use `style={{}}` for layout or theming. `StyleSheet.create` is banned.
- Use **theme token utilities** defined in `global.css`:
  - Background: `bg-background`, `bg-card`, `bg-muted`
  - Text: `text-foreground`, `text-muted-foreground`
  - Borders: `border-border`
  - Actions: `bg-primary`, `text-primary-foreground`
  - Destructive: `bg-destructive`, `text-destructive`

### Theme Tokens (from `global.css`)

Light / dark variants switch at runtime via `Uniwind.setTheme()`.

| Token | Light | Dark |
|---|---|---|
| `background` | `#ffffff` | `#0a0a0a` |
| `foreground` | `#0a0a0a` | `#fafafa` |
| `card` | `#ffffff` | `#171717` |
| `muted` | `#f5f5f5` | `#262626` |
| `muted-foreground` | `#737373` | `#a1a1a1` |
| `border` | `#e5e5e5` | `#2e2e2e` |
| `primary` | `#171717` | `#fff5f5` |
| `accent` | `#f7f7f7` | `#262626` |
| `destructive` | `#e7000b` | `#ff6467` |

### Screen Template

```tsx
import { Box, VStack, Heading, Text } from "@gluestack-ui/themed";

export default function ExampleScreen() {
  return (
    <Box className="flex-1 bg-background">
      <VStack className="px-4 pt-6 gap-4">
        <Heading className="text-foreground text-2xl font-bold">Title</Heading>
        <Text className="text-muted-foreground text-base">Subtitle</Text>
      </VStack>
    </Box>
  );
}
```

---

## Components

### GlueStack v5 Alpha Usage

Import from `@gluestack-ui/themed`. Core primitives:

```tsx
import {
  Box, VStack, HStack, Center,
  Text, Heading,
  Button, ButtonText, ButtonSpinner,
  Input, InputField,
  Image,
  Pressable,
  Modal, ModalBackdrop, ModalContent,
} from "@gluestack-ui/themed";
```

### Feature Component Rules

- Components in `components/features/` are scoped — `buyer/` components import from `buyer/` only, not from `pro/`.
- Shared components (cross-feature) go in `components/features/shared/`.
- Components in `components/ui/` are pure primitives with no business logic.
- No component fetches data directly. Pass data as props or consume from a custom hook.

### Component File Pattern

```tsx
// components/features/shared/haul-card.tsx
import { Box, HStack, Text } from "@gluestack-ui/themed";
import type { Haul } from "@/types/haul.types";

interface HaulCardProps {
  haul: Haul;
  onPress: () => void;
}

export function HaulCard({ haul, onPress }: HaulCardProps) {
  return (
    <Box className="bg-card border border-border rounded-2xl p-4">
      <HStack className="justify-between items-center">
        <Text className="text-foreground font-semibold">{haul.title}</Text>
        <Text className="text-muted-foreground text-sm">{haul.status}</Text>
      </HStack>
    </Box>
  );
}
```

---

## State Management

### Client State — Zustand

Zustand stores hold auth context, location, and transient UI state. No server data in Zustand.

```ts
// stores/auth.store.ts
import { create } from "zustand";

type Role = "buyer" | "pro";

interface AuthState {
  role: Role | null;
  userId: string | null;
  userName: string | null;
  location: { lat: number; lng: number } | null;
  setRole: (role: Role) => void;
  setUser: (id: string, name: string) => void;
  setLocation: (location: { lat: number; lng: number }) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  role: null,
  userId: null,
  userName: null,
  location: null,
  setRole: (role) => set({ role }),
  setUser: (userId, userName) => set({ userId, userName }),
  setLocation: (location) => set({ location }),
  clear: () => set({ role: null, userId: null, userName: null, location: null }),
}));
```

**Store files:**
- `stores/auth.store.ts` — role, session, userName, location
- `stores/haul.store.ts` — activeHauls, pendingHaul
- `stores/job.store.ts` — availableJobs, activeJob

### Server State — TanStack Query

All Supabase data fetching goes through TanStack Query hooks. Never call services directly from components.

```ts
// hooks/use-active-hauls.ts
import { useQuery } from "@tanstack/react-query";
import { fetchActiveHauls } from "@/services/haul.service";

export function useActiveHauls(userId: string) {
  return useQuery({
    queryKey: ["hauls", "active", userId],
    queryFn: () => fetchActiveHauls(userId),
    enabled: !!userId,
  });
}
```

**Query key convention:** `[domain, filter, id]` — e.g. `["hauls", "active", userId]`, `["jobs", "available"]`.

### QueryClient Setup

```ts
// lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
    },
  },
});
```

Wrap root layout with `<QueryClientProvider client={queryClient}>`.

---

## Supabase Service Layer

### Client Singleton

```ts
// services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

Environment variables must be prefixed `EXPO_PUBLIC_` to be available in the client bundle.

### Service Function Pattern

```ts
// services/haul.service.ts
import { supabase } from "./supabase";
import type { Haul } from "@/types/haul.types";

export async function fetchActiveHauls(userId: string): Promise<Haul[]> {
  const { data, error } = await supabase
    .from("hauls")
    .select("*")
    .eq("buyer_id", userId)
    .eq("status", "active");

  if (error) throw error;
  return data;
}

export async function createHaul(payload: Omit<Haul, "id" | "created_at">): Promise<Haul> {
  const { data, error } = await supabase
    .from("hauls")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**Rules:**
- Services throw errors — never swallow them.
- Services return typed data — never `any`.
- Never call Supabase directly from components or stores.

### Type Generation

```bash
supabase gen types typescript --project-id <id> > types/database.types.ts
```

Re-run after any schema migration.

---

## TypeScript Conventions

- `interface` for object shapes, `type` for unions/aliases.
- No `any`. No `as unknown`. No non-null assertion (`!`) except at Supabase env vars and confirmed-non-null values.
- All props interfaces named `<Component>Props`.
- Enums as `const` objects with `as const`:

```ts
export const HaulStatus = {
  Pending: "pending",
  Active: "active",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;
export type HaulStatus = typeof HaulStatus[keyof typeof HaulStatus];
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `haul-card.tsx`, `auth.store.ts` |
| Components | PascalCase | `HaulCard`, `JobDetailHeader` |
| Hooks | `use-` prefix, camelCase | `useActiveHauls`, `useAuthStore` |
| Stores | `use<Name>Store` | `useAuthStore`, `useHaulStore` |
| Services | `<domain>.service.ts` | `haul.service.ts` |
| Types files | `<domain>.types.ts` | `haul.types.ts` |
| Route groups | `(name)/` | `(auth)/`, `(buyer)/`, `(pro)/` |
| Dynamic routes | `[param]` | `[id].tsx` |

---

## Screens Reference

Derived from `design-mock-ups/`:

| # | Screen | Route | Role |
|---|---|---|---|
| 01 | Login | `/(auth)/login` | Both |
| 02 | Onboarding (role select) | `/(auth)/onboarding` | Both |
| 03 | Location setup | `/(auth)/location` | Both |
| 04 | Buyer Dashboard | `/(buyer)/` | Buyer |
| 05 | Request Haul | `/(buyer)/request` | Buyer |
| 06 | Payment / Checkout | `/(buyer)/payment` | Buyer |
| 07 | Active Haul Tracking | `/haul/[id]` | Buyer |
| 08 | Pro Dashboard (job requests) | `/(pro)/` | Pro |
| 09 | Job Details | `/job/[id]/` | Pro |
| 10 | Active Job (in-transit) | `/job/[id]/active` | Pro |
