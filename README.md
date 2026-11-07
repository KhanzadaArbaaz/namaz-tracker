# Namaz Tracker

A small Namaz (Salah) tracker with Qaza reminders. Built with Next.js (App Router) and TypeScript, using a Neon Postgres database. Ready to deploy on Vercel.

- Prayer times from the Aladhan API, with **Hanafi Asr** (`school=1`) always on
- Calendar to mark each of the five daily prayers as prayed or missed
- Qaza count that goes up when you miss a prayer and down when you make one up (never below zero)
- Email and password login, with each user's data kept private

## Run it on your computer

1. Install Node.js 18.18 or newer.
2. In this folder, run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the two values (see "Create the database" and step 3 under "Set environment variables" below).
4. Run `npm run dev` and open http://localhost:3000.

The database tables are created automatically the first time the app runs. There is no migration step.

## 1. Create the GitHub repository and push the code

1. Sign in at https://github.com and click **New repository** (https://github.com/new).
2. Name it `namaz-tracker`. Leave it empty: do not add a README, .gitignore or licence. Click **Create repository**.
3. In a terminal, go to this project folder.
4. Run these commands, replacing `YOUR_USERNAME` with your GitHub username:

   ```bash
   git init
   git add .
   git commit -m "Namaz tracker"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/namaz-tracker.git
   git push -u origin main
   ```

5. Refresh the GitHub page. You should see your files. `.env.local` is not uploaded because `.gitignore` excludes it.

## 2. Create the database (Neon)

1. Sign up or log in at https://neon.tech (the free plan is enough).
2. Click **New Project**, give it a name (for example `namaz-tracker`), choose the region closest to your users, and click **Create**.
3. On the project dashboard, open **Connect** (Connection Details).
4. Copy the connection string. It looks like `postgresql://USER:PASSWORD@ep-xxxx.neon.tech/neondb?sslmode=require`. This is your `DATABASE_URL`.

## 3. Set environment variables in Vercel

1. Create the secret for login cookies. In a terminal run `openssl rand -base64 32` and copy the result. (No openssl? Run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.) This is your `AUTH_SECRET`.
2. Go to https://vercel.com, sign in (you can use your GitHub account), and click **Add New... > Project**.
3. Click **Import** next to your `namaz-tracker` repository. Vercel detects Next.js automatically.
4. Before deploying, open **Environment Variables** and add both of these (apply to Production, Preview and Development):

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon connection string from step 2 |
   | `AUTH_SECRET` | the random string from step 1 |

   For local development, put the same two values in `.env.local`.

## 4. Deploy

1. Click **Deploy** and wait for the build to finish (about a minute).
2. Open the `.vercel.app` address Vercel shows you.
3. Click **Create an account**, sign up, and allow location access when your browser asks. Vercel serves the site over HTTPS, which browsers require for location.
4. Every later `git push` to `main` redeploys the app automatically.

## Project notes

- **Database:** Neon Postgres, using the `@neondatabase/serverless` driver. It works well with Vercel's serverless functions and needs only one connection string.
- **Login:** passwords are hashed with salted `scrypt` (built into Node). The session is a signed, `httpOnly` cookie lasting 30 days. No auth library is needed.
- **Hanafi Asr:** every request to Aladhan includes `school=1`, set on the server in `app/api/times/route.ts`. The card at the top of the app shows "Asr method: Hanafi" to confirm it is active.
- **Calculation method:** the app does not force a method (such as Karachi or MWL), so Aladhan chooses the usual method for the location.
