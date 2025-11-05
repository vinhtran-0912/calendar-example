# calendar-example
Drag-and-drop weekly workout calendar built with Next.js, React DnD, and Tailwind CSS v4.

## Stack
- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS v4** with `@tailwindcss/postcss` and `tailwindcss-animated`
- **react-dnd** with HTML5 backend

## Quick start
```bash
pnpm install

# Terminal 1 – Next.js dev server
pnpm dev
```

- App: `http://localhost:3000`

## Features
- Drag exercises between sections and days
- Drag to a day to auto-create a section if needed
- Per-day add workout button (top-right +)
- Per-section add exercise button (bottom-right +)
- Section three-dot button opens rename modal directly (no dropdown)

## Drag-and-drop approach
- **Library/Provider**: `DndProvider` in `src/app/components/dnd-provider.tsx` using the HTML5 backend.
- **Draggable items**: `src/app/calendar/_components/draggable-exercise.tsx` uses `useDrag` with a compact payload like `{ type: 'EXERCISE', exerciseId, sourceDayId, sourceSectionId, index }`.
- **Drop targets**: `src/app/calendar/_components/droppable-day.tsx` and `src/app/calendar/_components/droppable-section.tsx` use `useDrop`, accept `'EXERCISE'`, and return `{ dayId, sectionId, index }`.
- **Move logic**: On drop, an action is dispatched to move or reorder the exercise; optional `hover` can refine reordering while dragging.
- **State updates**: Centralized immutable updates in `src/app/lib/state/calendarReducer.ts`, consumed by `src/app/calendar/page.tsx`.
- **Persistence**: Optimistic UI; sync via `src/app/api/calendar/mutation/route.ts`, read via `src/app/api/calendar/week/route.ts`; data backed by `db.json`.
- **Auto-scroll**: Horizontal auto-scroll during drag via `src/app/hooks/useHorizontalAutoScrollOnDrag.ts`.
- **UX cues**: Highlights when `isOver && canDrop`; invalid drops are prevented with `canDrop`.
- **IDs/keys**: Stable `exerciseId` and list keys to avoid remounts/flicker.
- **Edge cases**: Ignore drops outside targets, clamp indices, and no-op when dropping back to the original slot.
- **Performance**: Memoize item components and keep the drag payload minimal.

## Using the UI
- **Add workout to a day**: click the day header `+`, enter a name, Save.
- **Rename a section**: click the section `⋯`, edit name, Save.
- **Add exercise to a section**: click the section bottom `+`, fill fields, Save.
- **Edit an exercise**: click an exercise card; edit in modal and Save.
- **Move items**: drag and drop exercises or whole sections between days.

## Tailwind v4 notes
- Global styles live in `src/app/globals.css` using `@import "tailwindcss"` and `@theme` tokens.
- Custom tokens used here: `--color-calendar-bg`, `--color-purple-600`, `--color-gray-500`.
- `tailwind.config.ts` is minimal (content, plugin). Utilities like `bg-gray-500` come from Tailwind’s default palette or theme tokens.

## Scripts
```bash
pnpm dev          # Next.js dev server
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint
```

## Project notes
- Fonts are loaded with `next/font` (`Open Sans`).
- DnD types and calendar utilities are under `src/app/lib`.

## Learn more
- Next.js docs: https://nextjs.org/docs
- Tailwind CSS v4: https://tailwindcss.com

## Explanation of My Thought Process
- I use useReducer to manage complex state logic, since the calendar requires handling multiple state variables - The reducer pattern helps keep the state transitions organized and more scalable compared to multiple useState hooks.
- I implement drag-and-drop functionality for two types of items: EXERCISE and WORKOUT
- During drag-and-drop operations, I generate a new ID for the dropped item and remove the existing instance from the original column. This process is validated by comparing the target and source nodes.
- On smaller screens, I add an auto-scroll feature while dragging items. The page will automatically scroll in the direction of the drag, ensuring a smoother and more natural user experience on mobile devices. (use AI to help me to do j code)
