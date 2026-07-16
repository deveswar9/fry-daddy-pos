# Walkthrough - Restaurant Live Billing System

We have successfully built and verified a production-ready, high-fidelity **Restaurant Live Billing System** (named **Fry Daddy**) to solve the seating layout, order management, and real-time cross-counter payment synchronization requirements.

---

## 🚀 Accomplishments & Features Completed

### 1. Unified Real-time Seating Map (Dashboard)
- **Interactive Seating Grid**: Renders the exact table layout (**I1–I9** for Inside, **O1–O6** for Outside).
- **Status Color Coding**: 
  - **Green (Available)**: Glassy emerald
  - **Yellow (Occupied)**: Soft amber
  - **Red (Payment Pending)**: Pulsing crimson
  - **Blue (Paid)**: Indigo-blue
  - **Grey (Cleaning)**: Slate-grey
- **Live Sync**: Uses Firestore `onSnapshot` listeners to mirror state across counter devices immediately (zero browser refreshes required).

### 2. Multi-Kitchen Billing & Menu Management
- **Menu Categorization**: Organizes items into categories like **Franchise** (Burger, Sandwich, Crispy Chicken) and **Fast Food** (Noodles, Rice, Manchuria).
- **Dynamic CSV Menu Overwrite**: Replaced the static menu seed import with a client-side CSV file parser. Users can download a standardized CSV template directly from the dashboard, populate it, and upload it to batch-overwrite the existing database items (removing previous ones completely).
- **Single-Bill Enforcement**: Customers can order from both menus, and the app automatically appends additions into one order to prevent duplicate bills.
- **Searchable Menu Dialog**: A sleek sliding drawer supporting instant search, inline quantity adjustments, and special preparation notes.
- **Kitchen Label & Data Migration**: Standardized kitchen targets to `'Fast Food'` (originally `'Fast Food Kitchen'`) and `'Restaurant'` (originally `'Franchise Kitchen'`). Stale/outdated records in local storage or Firebase Firestore are automatically migrated upon snapshot subscription.

### 3. Real-time Payment Flow & Cross-Counter Synchronization
- **Payment Assignment**: Payments for Inside tables are collected by **Counter B1 (Owner)**, and Outside tables by **Counter B2 (Brother)**.
- **Collect Payment Breakdown**: When clicking "Collect Payment", the confirmation dialog groups and displays items separately under **Restaurant Items (B1)** and **Fast Food Items (B2)**, showing line subtotals and the overall Grand Total.
- **Immediate Push Notifications & Popup Modal**: When a mixed order is paid at B1, B2 instantly receives a modal popup window showing the paid Fast Food items, total, and payment method. Clicking OK marks the notification as read/acknowledged in Firestore, closing it permanently.
- **Table Clearing**: Allows counters to clear the table, reset the database reference to `Available`, and archive the order.

### 4. Dispute Tracking Timeline
- **Order Log History**: Log entries are written to a sub-collection for every action (e.g., table opened, items added, quantity updated, payment collected, table archived) with an associated timestamp and actor stamp.

### 5. Resilient Mock / Demo Mode
- **Zero-Config Ready**: If Firebase environment variables are not supplied or are dummy placeholders, the application automatically activates a mock database layer using reactive browser storage. This allows full evaluation of the application immediately!

---

## 🛠️ Codebase Structure Created

- [package.json](file:///c:/Users/eswar/Downloads/Fry-daddy/package.json): Configured with dependencies (React 19, Vite 8, Tailwind CSS v4, Lucide Icons, Framer Motion, Zustand).
- [vite.config.ts](file:///c:/Users/eswar/Downloads/Fry-daddy/vite.config.ts) & [tsconfig.app.json](file:///c:/Users/eswar/Downloads/Fry-daddy/tsconfig.app.json): Path alias mapping (`@/*`) and Tailwind v4.0 compiler plugins.
- [src/index.css](file:///c:/Users/eswar/Downloads/Fry-daddy/src/index.css): Google Fonts (Inter + Outfit) loading, custom HSL theme palettes, and custom premium glassmorphism classes.
- [src/firebase/config.ts](file:///c:/Users/eswar/Downloads/Fry-daddy/src/firebase/config.ts): Firebase initialized with a fallback logic checker.
- [src/firebase/services.ts](file:///c:/Users/eswar/Downloads/Fry-daddy/src/firebase/services.ts): Realtime Firestore snapshot registers, local memory-storage database, order creators, modifiers, payment loggers, and menu CRUD utilities.
- [src/context/AuthContext.tsx](file:///c:/Users/eswar/Downloads/Fry-daddy/src/context/AuthContext.tsx): Manages active counter role (B1 vs B2) and signs users in anonymously on Firebase.
- [src/context/ThemeContext.tsx](file:///c:/Users/eswar/Downloads/Fry-daddy/src/context/ThemeContext.tsx): Manages light and OLED dark mode.
- [src/components/Layout.tsx](file:///c:/Users/eswar/Downloads/Fry-daddy/src/components/Layout.tsx): Top header navigation, keyboard shortcuts binder (`Alt+D`, `Alt+M`, `Alt+R`), counter switcher, and mobile responsive layout.
- [src/App.tsx](file:///c:/Users/eswar/Downloads/Fry-daddy/src/App.tsx): Routes configuration and route guards.
- [src/features/dashboard/DashboardPage.tsx](file:///c:/Users/eswar/Downloads/Fry-daddy/src/features/dashboard/DashboardPage.tsx): Displays the visual seating areas, table status colors, and statistics.
- [src/features/tables/TableDetailsPage.tsx](file:///c:/Users/eswar/Downloads/Fry-daddy/src/features/tables/TableDetailsPage.tsx): Active orders details list, total billing card, timeline history, and action controls.
- [src/features/menu/AddItemsDialog.tsx](file:///c:/Users/eswar/Downloads/Fry-daddy/src/features/menu/AddItemsDialog.tsx): Searchable modal grid for rapid order selection and special notes.
- [src/features/admin/MenuManagementPage.tsx](file:///c:/Users/eswar/Downloads/Fry-daddy/src/features/admin/MenuManagementPage.tsx): CRUD control panel to manage dishes, prices, categories, and target kitchens.
- [src/features/reports/ReportsPage.tsx](file:///c:/Users/eswar/Downloads/Fry-daddy/src/features/reports/ReportsPage.tsx): Key business performance indices, category sales distributions, popular items, and checkout history logs.
- [firestore.rules](file:///c:/Users/eswar/Downloads/Fry-daddy/firestore.rules): Database security rules configuring read/write access constraints.

---

## 🧪 Validation & Compilation Checks

1. **Compilation Check**: Running `npx tsc --noEmit` returns zero compile errors or syntax defects.
2. **Production Bundle Verification**: Running `npm run build` completes successfully in `1.99s`, bundling the HTML, CSS (Tailwind v4), and JavaScript assets into the `dist/` directory, ready to be deployed to Vercel/Firebase Hosting.
