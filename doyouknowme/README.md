# DoYouKnowMe?

A small React + Supabase questionnaire app. Respondents enter a name and submit answers. Only the signed-in owner can view submissions.

## 1. Create the database

1. Create a project at https://supabase.com/.
2. Open **SQL Editor** -> **New query**.
3. Paste all of `supabase/schema.sql` and click **Run**.
4. Open **Project Settings** -> **API**. Copy the Project URL and the `anon` / publishable key.
   - Never use or publish the `service_role` / secret key in this website.

## 2. Run the website locally

Install Node.js (LTS) from https://nodejs.org/ and restart your terminal.

In this project folder:
```bash
npm install
```
Create a file named `.env` in the project root:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```
Then run:
```bash
npm run dev
```
Open the local URL Vite prints (usually http://localhost:5173).

## 3. Create your admin account

Open the local site without a `?form=` query. Choose **Create my admin account** and use your own email and a strong password. If Supabase asks you to confirm your email, do that first, then sign in.

The app creates your first questionnaire automatically. Add questions in the dashboard.

## 4. Publish with Netlify

1. Push this project to a GitHub repository.
2. In Netlify choose **Add new site** -> **Import an existing project** -> GitHub -> select `doyouknowme`.
3. Build command: `npm run build`; publish directory: `dist`.
4. In Netlify site settings -> Environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. If you add environment variables after the first deploy, trigger a new deploy.

## 5. Important security notes

- The browser uses only the Supabase anon/publishable key. That key is designed to be public; Row Level Security (RLS) policies protect the data.
- Never put a Supabase `service_role` or secret key in frontend code or Netlify's `VITE_` variables.
- Anyone with the questionnaire link can submit a response. Only the authenticated owner can read responses.
- This starter uses public questionnaire links and does not include spam protection, CAPTCHA, or rate limiting. Add those before using it for a large public audience.
- The owner account should use a strong, unique password and email confirmation.
