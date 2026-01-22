# Phase C: Threaded Social Ecosystem - User Flows

Project: Nonnas of the World | Date: January 8, 2026 (Updated)

## ARCHITECTURE OVERVIEW

### Primary Navigation Structure
- **Home Page (/)**: Virtual Flipbook - Primary landing page, core brand experience
- **Explore Page (/explore)**: Globe view - Alternative navigation method, separate page to avoid clutter
- **Header**: Simplified logo (head + book + "nonnas of the world" text) with icon-based navigation

### Discussion Hierarchy
1. **Regional Discussions**: Country/region-level conversations accessed via Globe → Map → Community panel
2. **Recipe Comments**: Individual recipe-specific comments embedded directly on recipe pages in flipbook

### Visual Implementation Notes
- Map discussions appear as a **side panel** (not modal), floating with Z-index over map
- Map shifts left when discussion panel opens, remains visible behind panel
- Recipe comments use traditional comment section below recipe content
- Globe and Book are separate pages, accessible via header navigation

---

## FLOW 1: Header Navigation

**User on any page** → Header displays:
- **Logo** (head + book + text) → Clicks → Navigates to `/` (Virtual Flipbook)
- **[Globe Icon]** → Clicks → Navigates to `/explore` (Globe view)
- **[Book Icon]** → Clicks → Navigates to `/` (Flipbook home)
- **[Search Bar]** → Type and search recipes/users
- **[+ Add Nana]** button → Authenticated users can submit recipes
- **[Settings Icon]** → User settings (if logged in)
- **User Avatar** → Profile dropdown menu

---

## FLOW 2: Regional Discussion Hub Access

**Header** → User clicks **[Globe Icon]** → `/explore` page loads with 3D Globe → 

User clicks continent → 2D Map opens at `/explore/map/[region]` → 

Map shifts to **left side** of viewport → **NonnaModal** appears with 2 tabs: [Recipes], [Community] → 

User clicks **[Community]** tab → **Discussion Panel** renders on **right side** (floating over map with Z-index, map visible behind) → 

Discussion Panel shows:
- Thread list for selected region
- Category filters (Traditions, Cooking Tips, Travel Stories, etc.)
- Sort options (Top, Newest, Relevant)
- **[+ Start Discussion]** button

User clicks thread → **Thread View** opens at `/community/thread/[id]` (full page or modal) → 

Shows: Post content, nested replies, **[Reply]** and **[❤ Like]** buttons (if logged in)

---

## FLOW 3: Recipe-Specific Comments

**Home page (/)** → Virtual Flipbook → User navigating recipe pages → 

**Recipe Page** displays → Scrolls down below recipe content → 

**Comments Section** appears with:
- Existing comments (nested, with user avatars)
- Comment count
- **[Add Comment]** button

User clicks **[Add Comment]** → 

**IF not logged in**: Redirect to `/handler/sign-in` →

**IF logged in**: Comment editor opens inline → 

User writes comment and clicks **[Submit]** → 

API: `POST /api/recipe-comments` (with recipe_id, user_id, content) → 

Comment appears immediately below recipe

**Replying to comments**: User clicks **[Reply]** on existing comment → Reply editor opens nested → Same auth flow → Reply displays indented under parent

**Note**: These are recipe-specific, separate from regional discussions

---

## FLOW 4: Creating a Regional Thread

**Discussion Panel** (from FLOW 2) → User clicks **[+ Start Discussion]** → 

**IF not logged in**: Redirect to `/handler/sign-in` → 

**IF logged in**: Navigate to `/community/create` → 

**Create Thread Form** displays:
- Title field
- Category dropdown (auto-filled with region)
- Content editor (rich text)
- **[Post]** button

User fills form and clicks **[Post]** → 

API: `POST /api/threads` (with region, category, title, content, user_id) → 

Redirect to `/community/thread/[id]` (Thread View)

---

## FLOW 5: Replying to Discussion Posts

**Thread View** → User sees nested replies → Clicks **[Reply]** on any post → 

**IF not logged in**: Show tooltip "Sign in to reply" → 

**IF logged in**: Reply editor opens inline below the post → 

User writes reply and clicks **[Submit]** → 

API: `POST /api/posts` (with thread_id, parent_post_id, user_id, depth) → 

Reply appears nested under parent with indentation

---

## FLOW 6: Liking Content

**Thread View** or **Recipe Comment** → User sees **[❤ Like]** button with count → 

User clicks → 

**IF not logged in**: Show tooltip "Sign in to like" → 

**IF logged in**: API: `POST /api/likes` (with content_id, type, user_id) → 

**IF already liked**: Remove like → Count decrements, button color reverts → 

**IF not liked**: Add like → Count increments, button highlights red → 

Button updates optimistically (immediate UI feedback)

---

## FLOW 7: Enhanced Map Integration (2-Tab Modal)

**2D Map View** (`/explore/map/[region]`) → **NonnaModal** displays with 2 tabs:

### TAB 1: [Recipes]
- List of recipes from selected region
- Recipe cards with images, titles, authors
- **[View Recipe]** button → Opens flipbook to that recipe page

### TAB 2: [Community]
- Thread list for region
- Category filters (Traditions, Cooking, Travel, Culture)
- **[+ Start Discussion]** button (triggers FLOW 4)
- Sort dropdown (Top, Newest, Relevant)
- Threads show: title, author, reply count, like count
- Click thread → Opens Thread View

**Visual Layout**: Modal shifts map to left, appears as floating panel on right with Z-index overlay, map remains visible behind

---

