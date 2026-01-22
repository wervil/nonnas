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

## FLOW 8: User Profile

**Header** → User clicks **avatar** → Dropdown appears with:
- "My Profile"
- "My Discussions"
- "Settings"
- "Logout"

User clicks **"My Profile"** → Navigate to `/profile/[user_id]` → 

**Profile Page** displays:

### About Section
- Avatar, name, location, cultural background
- **[Edit Profile]** button (if viewing own profile)

### Recipes Contributed
- Grid of recipe cards with images
- Click card → Opens flipbook to that recipe

### Community Activity
- Recent discussions started
- Recent replies
- Total likes received

### Privacy Settings (if own profile)
- Comment visibility preferences
- Block list management

---

## FLOW 9: Admin Moderation

**Admin Dashboard** (`/dashboard`) → Sidebar shows **[Community]** menu item → 

Click **[Community]** → Opens with 4 tabs:

### TAB 1: [Flagged Content]
- List of reported posts/threads
- Shows: content preview, reporter, reason, timestamp
- Actions: **[Approve]**, **[Delete]**, **[Warn User]**, **[Ban User]**
- Click action → API: `PATCH /api/moderation/[id]` → Status updates

### TAB 2: [Recent Activity]
- All threads/posts chronologically
- Quick **[Delete]** button for each item
- Filters: Date range, region, category, user
- Search functionality

### TAB 3: [User Management]
- Table of users sorted by activity
- Columns: Name, Recipes, Posts, Replies, Join date, Status
- Actions: **[Warn]**, **[Suspend]**, **[Ban]**
- View warning history



---

## NEW UI ELEMENTS

| Location | Element | Action | Auth |
|----------|---------|--------|------|
| Header | [Globe Icon] | Navigate to `/explore` | No |
| Header | [Book Icon] | Navigate to `/` | No |
| Header | [Search Bar] | Search recipes/users | No |
| Header | [+ Add Nana] | Submit recipe form | Yes |
| Header | User Avatar | Profile dropdown | Yes |
| NonnaModal | [Recipes] tab | Show recipe list | No |
| NonnaModal | [Community] tab | Show discussion panel | No |
| Recipe Page (Flipbook) | Comments section | Show nested comments | No (read) |
| Recipe Page | [Add Comment] | Comment editor | Yes |
| Recipe Comment | [Reply] button | Reply editor inline | Yes |
| Recipe Comment | [❤ Like] button | Toggle like | Yes |
| Discussion Panel | [+ Start Discussion] | `/community/create` | Yes |
| Thread Post | [Reply] button | Reply editor inline | Yes |
| Thread Post | [❤ Like] button | Toggle like | Yes |

---

## ROUTES

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Virtual Flipbook (PRIMARY LANDING) |
| `/explore` | Public | Globe view (alternative navigation) |
| `/explore/map/[region]` | Public | 2D Map with integrated discussion panel |
| `/community/[region]` | Public | Discussion hub (read-only) |
| `/community/create` | Auth Required | Create thread form |
| `/community/thread/[id]` | Public | Thread view (read), Reply/Like (auth) |
| `/profile/[id]` | Public | User profile |
| `/settings` | Auth Required | Privacy and account settings |
| `/dashboard` | Admin Only | Admin dashboard |
| `/dashboard/community` | Admin Only | Community moderation panel |

---

## API ENDPOINTS

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/threads` | GET | No | Fetch threads (with filters) |
| `/api/threads` | POST | Yes | Create thread |
| `/api/threads/[id]` | GET | No | Fetch single thread with posts |
| `/api/threads/[id]` | DELETE | Yes (owner/admin) | Delete thread |
| `/api/posts` | POST | Yes | Create reply |
| `/api/posts/[id]` | PATCH | Yes (owner) | Edit post |
| `/api/posts/[id]` | DELETE | Yes (owner/admin) | Delete post |
| `/api/recipe-comments` | GET | No | Fetch comments for recipe |
| `/api/recipe-comments` | POST | Yes | Create recipe comment |
| `/api/recipe-comments/[id]` | PATCH | Yes (owner) | Edit comment |
| `/api/recipe-comments/[id]` | DELETE | Yes (owner/admin) | Delete comment |
| `/api/likes` | POST | Yes | Toggle like (threads, posts, comments) |
| `/api/favorites` | POST | Yes | Toggle favorite recipe |
| `/api/report` | POST | Yes | Report content (threads, posts, users) |
| `/api/moderation/[id]` | PATCH | Admin | Moderate content (approve, delete, warn, ban) |
| `/api/users/[id]` | GET | No | Fetch user profile |
| `/api/users/[id]` | PATCH | Yes (owner) | Update profile |
| `/api/users/[id]/block` | POST | Yes | Block user |

---

## DATABASE SCHEMA ADDITIONS

### threads table
```sql
id, region, category, title, content, user_id, created_at, updated_at, is_pinned, is_locked, view_count
```

### posts table
```sql
id, thread_id, parent_post_id, user_id, content, depth, created_at, updated_at
```

### recipe_comments table
```sql
id, recipe_id, parent_comment_id, user_id, content, depth, created_at, updated_at
```

### likes table
```sql
id, user_id, likeable_id, likeable_type (thread/post/comment), created_at
```

### reports table
```sql
id, reporter_id, reported_id, reported_type (thread/post/user), reason, status (pending/resolved), created_at
```

### user_blocks table
```sql
id, blocker_id, blocked_id, created_at
```

---

## IMPLEMENTATION PRIORITIES

### Phase 1: Core Discussion Features
- Recipe comments system (FLOW 3)
- Thread creation and viewing (FLOW 4, 5)
- Like functionality (FLOW 6)

### Phase 2: Navigation & Integration
- Header redesign with icons (FLOW 1)
- Globe/Map integration with discussion panel (FLOW 2, 7)
- 2-tab modal system

### Phase 3: Social Features
- User profiles with activity (FLOW 8)

### Phase 4: Moderation & Polish
- Admin moderation dashboard (FLOW 9)
- Reporting system
- Analytics tracking
- Character limits on all text inputs
- "Read more" functionality for long content

---

## DESIGN NOTES

### Character Limits (to prevent layout breaks)
- Thread Title: 120 characters
- Thread Content: 5,000 characters (with "Read more" after 500 chars)
- Reply/Comment: 2,000 characters (with "Read more" after 300 chars)
- User Bio: 500 characters

### Required Fields
- Recipe images: Mandatory (to avoid empty frames)
- Thread title and content: Required
- User avatar: Default placeholder if not uploaded

### Responsive Design
- Mobile: Discussion panel becomes full-screen modal
- Tablet: Side-by-side layout with narrower panels
- Desktop: Full side panel implementation with map visible

### Accessibility
- Keyboard navigation for all interactive elements
- ARIA labels for icons
- Screen reader support for nested comments
- Focus management for modals

---

## QUALITY ASSURANCE CHECKLIST

- [ ] All text inputs have character limits enforced
- [ ] Recipe image is required field (cannot be skipped)
- [ ] "Read more" button appears for truncated content
- [ ] Auth gates properly redirect to sign-in
- [ ] Nested comments/replies display with proper indentation
- [ ] Like buttons update optimistically
- [ ] Map shifts left smoothly when discussion panel opens
- [ ] Discussion panel has proper Z-index overlay
- [ ] Header navigation icons work on all pages
- [ ] Mobile responsiveness for all new components
- [ ] Admin moderation actions require confirmation
- [ ] Reported content flagged immediately
- [ ] Comment notifications work properly
- [ ] Profile privacy settings respected

---

**Last Updated**: January 8, 2026  
**Updated By**: Development Team  
**Change Log**: Separated Globe and Flipbook into distinct pages, integrated discussion panel with map view, added recipe-specific comments, simplified header design, removed Connect tab and direct messaging features (focus on comments-only social interaction)

