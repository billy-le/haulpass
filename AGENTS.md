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
| Forms | React Hook Form v5 + Zod v3 | `zodResolver` from `@hookform/resolvers` |
| Server state | TanStack Query v5 | All API/Supabase data fetching |
| Client state | Zustand v5 | Auth role, location, transient UI state |
| Backend | Supabase | `@supabase/supabase-js` |
| Platform | React Native (iOS + Android) | No web output. No `.web.tsx` files. |

---

## Directory Structure

```
app/
  _layout.tsx                  # Root: GluestackUIProvider, QueryClientProvider, onAuthStateChange
  index.tsx                    # Auth guard: → (auth)/login | (onboarding)/profile | (buyer) | (pro)
  (auth)/
    _layout.tsx                # Stack navigator, no header
    login.tsx                  # Email + Google + Apple sign-in
    signup.tsx                 # Email sign-up with confirmation state
  (onboarding)/
    _layout.tsx                # Guard: no session → login, isOnboarded → dashboard
    profile.tsx                # Step 1 — first/last name (pre-filled from OAuth)
    onboarding.tsx             # Step 2 — role selection (buyer | pro)
    account-details.tsx        # Step 3 — role-specific details (location or vehicle/license)
  (buyer)/
    _layout.tsx                # Tab navigator (index, request, account); auth guard
    index.tsx                  # Buyer dashboard — active hauls list + empty state
    request.tsx                # New haul request form
    account.tsx                # Profile, sign out, delete account
  (pro)/                       # Not yet built
  haul/
    [id].tsx                   # Not yet built

components/
  ui/                          # GlueStack component wrappers — no business logic
    button/index.tsx           # Button, ButtonText, ButtonSpinner, ButtonIcon, ButtonGroup
    gluestack-ui-provider/     # Theme provider
    hstack/index.tsx           # HStack (flex-row + gap via space prop)
    vstack/index.tsx           # VStack (flex-col + gap via space prop)
    input/index.tsx            # Input, InputField, InputSlot, InputIcon
    modal/index.tsx            # Modal, ModalBackdrop, ModalContent, ModalHeader, ModalBody, ModalFooter
    icon-symbol.tsx            # SF Symbols → MaterialIcons cross-platform wrapper

stores/
  auth.store.ts                # session, userId, role, firstName, lastName, isOnboarded, location

services/
  supabase.ts                  # Supabase client singleton
  auth.service.ts              # signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, updateUserMetadata
  haul.service.ts              # fetchBuyerHauls (direct query), createHaul (calls Edge Function)

supabase/
  migrations/                  # SQL migrations — always created via: supabase migration new <name>
  functions/
    create-haul/index.ts       # Edge Function: verify JWT → insert haul via service role
    delete-account/index.ts    # Edge Function: nullify completed hauls, delete auth user

hooks/
  use-color-scheme.ts

types/
  auth.types.ts                # Role, BuyerLocation, ProProfile
  haul.types.ts                # Haul, HaulStatus
  database.types.ts            # Generated — run: pnpm gen:types

lib/
  query-client.ts              # TanStack Query client (staleTime: 30s, gcTime: 5min)

constants/
  theme.ts
```

---

## Routing

```
/                         → app/index.tsx           (redirect only — no UI)
/(auth)/login             → app/(auth)/login.tsx
/(auth)/signup            → app/(auth)/signup.tsx
/(onboarding)/profile     → app/(onboarding)/profile.tsx
/(onboarding)/onboarding  → app/(onboarding)/onboarding.tsx
/(onboarding)/account-details → app/(onboarding)/account-details.tsx
/(buyer)                  → app/(buyer)/index.tsx   (tab: dashboard)
/(buyer)/request          → app/(buyer)/request.tsx
/(buyer)/account          → app/(buyer)/account.tsx
```

**Root layout** (`app/_layout.tsx`) wraps in:
1. `SafeAreaListener` (Uniwind inset tracking)
2. `GestureHandlerRootView`
3. `GluestackUIProvider`
4. `QueryClientProvider` (TanStack Query)
5. `supabase.auth.onAuthStateChange` → `useAuthStore.setSession`

**Auth redirect** (`app/index.tsx`):
```
no session    → /(auth)/login
not onboarded → /(onboarding)/profile
buyer         → /(buyer)
pro           → /(pro)
```

---

## Styling

### Rules

- Use **GlueStack layout components** (`VStack`, `HStack`) for directional gap layouts.
- Use **GlueStack `Input`/`InputField`** for all text inputs.
- Use **GlueStack `Modal`** for overlays.
- Raw `View`, `Text`, `Pressable`, `ScrollView`, `KeyboardAvoidingView` from React Native are acceptable for containers, text, and scroll — GlueStack does not provide these in v5 alpha.
- **Always style with `className`**. Never use `style={{}}` for layout or theming. `StyleSheet.create` is banned.
- Use **theme token utilities** defined in `global.css`:
  - Background: `bg-background`, `bg-card`, `bg-muted`
  - Text: `text-foreground`, `text-muted-foreground`
  - Borders: `border-border`
  - Actions: `bg-primary`, `text-primary-foreground`
  - Brand: `bg-brand`, `text-brand` (terracotta — not the same as `primary`)
  - Destructive: `bg-destructive`, `text-destructive`

### Theme Tokens (from `global.css`)

Light / dark variants switch at runtime via `Uniwind.setTheme()`.

| Token | Light | Dark |
|---|---|---|
| `background` | `oklch(97% 0.012 80)` warm off-white | `#16130e` warm dark |
| `foreground` | `oklch(20% 0.02 60)` warm near-black | `#f2efea` warm near-white |
| `card` | `oklch(99% 0.005 80)` near-white | `#1f1c16` dark card |
| `muted` | `#eeeae4` warm light gray | `#2a261f` dark muted |
| `muted-foreground` | `oklch(48% 0.015 60)` warm gray | `#9b9690` warm mid |
| `border` | `oklch(89% 0.012 80)` warm sand | `#3a352c` warm dark border |
| `primary` | `#29251d` warm near-black | `#f7f4ef` warm near-white |
| `destructive` | `oklch(55% 0.2 30)` warm red | `#dc5a32` warm red-orange |
| `brand` | `oklch(58% 0.16 35)` terracotta | same — brand constant |

### Screen Template

```tsx
import { ScrollView, Text, View } from "react-native";
import { VStack } from "@/components/ui/vstack";

export default function ExampleScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <VStack space="xl" className="px-6 pt-16 pb-12">
          <Text className="text-foreground text-4xl font-light">Title</Text>
          <Text className="text-muted-foreground text-lg">Subtitle</Text>
        </VStack>
      </ScrollView>
    </View>
  );
}
```

### VStack / HStack Space Values

| Prop | Gap |
|---|---|
| `space="xs"` | `gap-1` |
| `space="sm"` | `gap-2` |
| `space="md"` | `gap-3` |
| `space="lg"` | `gap-4` |
| `space="xl"` | `gap-5` |
| `space="2xl"` | `gap-6` |

### Underline Input Pattern

All form inputs use bottom-border-only style:

```tsx
<Input className="border-0 border-b border-border rounded-none shadow-none px-0">
  <InputField
    className="py-3 text-foreground text-base"
    placeholder="..."
    placeholderTextColor="#737373"
  />
</Input>
```

---

## Components

### Installed GlueStack Components

Import from local `@/components/ui/*` — never from `@gluestack-ui/themed` or `@gluestack-ui/core` directly.

```tsx
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Modal, ModalBackdrop, ModalContent } from "@/components/ui/modal";
import { IconSymbol } from "@/components/ui/icon-symbol";
```

Add new components via:
```bash
npx gluestack-ui@alpha add <component-name>
```

### IconSymbol

Cross-platform icon component. Uses SF Symbols on iOS, MaterialIcons on Android.

```tsx
<IconSymbol name="house.fill" color={color} size={size} />
```

Add new icon mappings in `components/ui/icon-symbol.tsx` MAPPING object.

---

## State Management

### Client State — Zustand

Zustand stores hold auth context and transient UI state. No server data in Zustand.

**`stores/auth.store.ts`** actual shape:
```ts
interface AuthState {
  session: Session | null;
  userId: string | null;
  userName: string | null;
  firstName: string | null;
  lastName: string | null;
  role: Role | null;
  isOnboarded: boolean;
  location: { lat: number; lng: number } | null;
  setSession: (session: Session | null) => void;  // hydrates all fields from user_metadata
  setRole: (role: Role) => void;
  setOnboarded: (val: boolean) => void;
  setLocation: (location: { lat: number; lng: number }) => void;
  clear: () => void;
}
```

`setSession` is the single hydration point — called by `onAuthStateChange` in root layout. It reads `user.user_metadata` to populate `role`, `firstName`, `lastName`, `isOnboarded`.

### Server State — TanStack Query

All Supabase data fetching goes through TanStack Query. Never call services directly from components.

```ts
const { data: hauls } = useQuery({
  queryKey: ["hauls", userId],
  queryFn: () => fetchBuyerHauls(userId!),
  enabled: !!userId,
});
```

**Query key convention:** `[domain, id]` or `[domain, filter, id]`

---

## Supabase Service Layer

### Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUB_KEY=     # anon/public key (NOT service role)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

The client singleton uses `EXPO_PUBLIC_SUPABASE_PUB_KEY` with AsyncStorage for session persistence.

### Service Patterns

**Direct queries** (reads, RLS-protected):
```ts
export async function fetchBuyerHauls(buyerId: string): Promise<Haul[]> {
  const { data, error } = await supabase
    .from("hauls").select("*").eq("buyer_id", buyerId);
  if (error) throw error;
  return data as Haul[];
}
```

**Edge Function calls** (mutations requiring service role or extra logic):
```ts
export async function createHaul(payload: { ... }): Promise<Haul> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-haul`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

**Rules:**
- Services throw errors — never swallow them.
- Services return typed data — never `any`.
- Never call Supabase directly from components or stores.

### Edge Functions

Located in `supabase/functions/<name>/index.ts`. Use `jsr:@supabase/supabase-js@2`.

Pattern: verify JWT via anon client → do privileged work via service role client.

```ts
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // ... privileged operations
});
```

Deploy: `supabase functions deploy <name>`

### Migrations

Always use the Supabase CLI to create migration files — never create them manually.

```bash
# Create (generates supabase/migrations/<timestamp>_<name>.sql)
supabase migration new <name>

# Apply to local dev DB
supabase db reset

# Apply to remote (linked project)
supabase db push
```

Write SQL into the generated file after `migration new`. Never rename the timestamp prefix.

### Type Generation

```bash
pnpm gen:types
```

Re-run after any schema migration. Outputs to `types/database.types.ts`.

### RLS Patterns

```sql
ALTER TABLE hauls ENABLE ROW LEVEL SECURITY;

-- Public read for authenticated users (pros browse hauls)
CREATE POLICY "hauls_select_authenticated" ON hauls
  FOR SELECT TO authenticated USING (true);

-- Owner-only write
CREATE POLICY "hauls_insert_owner" ON hauls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "hauls_update_owner" ON hauls
  FOR UPDATE TO authenticated USING (auth.uid() = buyer_id);

CREATE POLICY "hauls_delete_owner" ON hauls
  FOR DELETE TO authenticated USING (auth.uid() = buyer_id);
```

---

## TypeScript Conventions

- `interface` for object shapes, `type` for unions/aliases.
- No `any`. No `as unknown`. No non-null assertion (`!`) except at Supabase env vars.
- All props interfaces named `<Component>Props`.
- Status unions as string literal types:

```ts
export type HaulStatus = "pending" | "matched" | "in_transit" | "completed" | "cancelled";
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

| # | Screen | Route | Status |
|---|---|---|---|
| 01 | Login | `/(auth)/login` | ✅ Built |
| 02 | Sign Up | `/(auth)/signup` | ✅ Built |
| 03 | Profile (name) | `/(onboarding)/profile` | ✅ Built |
| 04 | Role Selection | `/(onboarding)/onboarding` | ✅ Built |
| 05 | Account Details | `/(onboarding)/account-details` | ✅ Built |
| 06 | Buyer Dashboard | `/(buyer)/` | ✅ Built |
| 07 | Request Haul | `/(buyer)/request` | ✅ Built |
| 08 | Buyer Account | `/(buyer)/account` | ✅ Built |
| 09 | Payment / Checkout | `/(buyer)/payment` | ⬜ Not built |
| 10 | Active Haul Tracking | `/haul/[id]` | ⬜ Not built |
| 11 | Pro Dashboard | `/(pro)/` | ⬜ Not built |
| 12 | Job Details | `/job/[id]/` | ⬜ Not built |
| 13 | Active Job (in-transit) | `/job/[id]/active` | ⬜ Not built |
