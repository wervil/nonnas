# Report Feature — Scope Document

## Overview

This document outlines the scope for building a **user reporting system** on Nonnas. The goal is to give community members a way to flag content or users that are harmful, fake, or inappropriate, and give admins the tools to review and act on those reports.

## What Users Need to Be Able to Report

| What                    | Examples                                          |
| ----------------------- | ------------------------------------------------- |
| **A recipe**            | Fake/stolen recipe, offensive content, spam       |
| **A comment**           | Abusive language, harassment, spam                |
| **A discussion thread** | Misinformation, off-topic spam, offensive content |
| **A reply in a thread** | Same as above                                     |
| **A user**              | Harassment, impersonation, fake account           |

## How the Reporting Flow Works (User Side)

1. Every recipe, comment, thread, and user profile has a **"Report" option** (e.g. via a 3-dot/more menu).
2. Tapping "Report" opens a small popup asking the user to **select a reason**:
   - Spam
   - Inappropriate or offensive content
   - Harassment or bullying
   - Fake or misleading content
   - Other
3. The user optionally adds a **short note** to explain their report.
4. They submit and see a confirmation message:
   > _"Thanks for letting us know. Our team will review this."_

The reported content **stays visible** until an admin reviews and decides what to do. A report alone does not remove anything.

## How It Works for Admins

Admins get a **Reports Queue** in the dashboard showing all pending reports with:

- What was reported (recipe / comment / user / etc.)
- A preview of the reported content
- The reason selected by the reporter
- When it was reported

For each report, the admin can choose one of the following actions:

| Action             | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| **Dismiss**        | Report closed. Content stays. No action taken.                 |
| **Remove content** | The comment, recipe, or thread is hidden from all users.       |
| **Warn user**      | A note is added to the user's account. Could trigger an email. |
| **Ban user**       | User is suspended and can no longer access the platform.       |

## Important Rules & Guardrails

- A **user cannot report the same piece of content twice** (one report per user per item).
- Reports are **anonymous**. The reported user does not know who reported them.
- The reporter is **not told the outcome** of the review, to protect privacy on both sides.
- Admins are the **only ones** who can take action. Users cannot remove each other's content.
- **False reporting** (repeated bad-faith reports) can itself be grounds for a warning.

## What This Feature Does NOT do

- It does not automatically remove content when it is reported (human review required).
- It does not notify the reported user unless an admin decides to warn or ban them.
- It does not replace the existing automatic filter. The two systems work alongside each other.

## How It Fits With What Already Exists

The existing system blocks bad content **before** it gets posted (automatic, real-time).

The new reporting system handles everything **after** content is already live (human-reviewed, retroactive).

```
User submits content
    ↓
Automatic filter runs → blocked if flagged     ← already built
    ↓ (if passes)
Content goes live
    ↓
Another user reports it → admin reviews → action taken     ← this feature
```

## Summary of New Things to Build

| #   | What to build                                                           |
| --- | ----------------------------------------------------------------------- |
| 1   | Report button on recipes, comments, threads, replies, and user profiles |
| 2   | Report popup with reason selection + optional note                      |
| 3   | Backend system to store and manage reports                              |
| 4   | Admin reports queue in the dashboard                                    |
| 5   | Admin action buttons (Dismiss / Remove / Warn / Ban)                    |
| 6   | One-report-per-user-per-item safeguard                                  |
