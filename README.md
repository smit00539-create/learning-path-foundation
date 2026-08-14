# Learning Path Foundation

Build the foundation for a progress-tracking web app for a kids' learning center (ages 3-12) that uses educational toys/books. This is Phase 0 — just auth, roles, and navigation shell. No feature screens yet.

Set up Supabase as the backend with the following:

1. Use Supabase Auth for login (email/phone + password, no self-signup/public registration page needed — accounts will be created by admins later).

2. Create a `profiles` table that extends `auth.users`:

   - id (uuid, references auth.users)

   - role (text: 'admin', 'instructor', or 'parent')

   - full_name (text)

   - phone (text)

3. Build role-based routing/navigation:

   - After login, check the user's role from `profiles`.

   - If role is 'admin' or 'instructor', show an "Admin" layout with a sidebar/nav containing placeholder pages: Dashboard, Batches, Students, Curriculum, Sessions, Reports.

   - If role is 'parent', show a "Parent" layout with a bottom nav (mobile-first) containing placeholder pages: Today, Progress, History.

   - Each placeholder page can just say "Coming in a later phase" for now.

4. Login page should be clean and simple — this is a real product for parents and instructors, not a demo. Mobile-first design for the parent side, can be more desktop-oriented for the admin side.

5. Add a basic logout function.

6. Don't build any curriculum, student, or session features yet — this phase is only auth + role routing + navigation shell. We'll build features phase by phase after this.

Once done, I need to be able to manually create one admin user (myself) directly in Supabase to test the admin login flow.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f436db92-6ee0-4e4b-8415-1cb4c03bfbbf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
