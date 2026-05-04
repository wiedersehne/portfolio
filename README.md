# Editorial Portfolio

A minimal, fashion-oriented modeling portfolio built with **Next.js 16**, **React 19**, **Tailwind CSS 4** and **Cloudinary** for media hosting. Photos and videos display in an editorial grid; a password-protected admin panel handles uploads and deletions.

## Features

- Editorial, Vogue-inspired minimal aesthetic (Playfair Display + Inter)
- Responsive grid view of all photos and videos
- Click any item for a fullscreen lightbox with keyboard navigation
- Password-protected admin dashboard at `/admin`
- Drag-and-drop multi-upload with per-file progress
- One-click delete on any media item
- Cloudinary-powered, automatic thumbnails, video posters, and global CDN
- Ready for one-click deployment on Vercel

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Create a free Cloudinary account

1. Sign up at <https://cloudinary.com/users/register_free>
2. After login, open the **Dashboard** (top-left).
3. Copy your **Cloud name**, **API Key**, and **API Secret**.

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Then fill it in:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-secret
CLOUDINARY_FOLDER=portfolio

ADMIN_PASSWORD=pick-a-strong-password
AUTH_SECRET=generate-a-long-random-string-32-chars-or-more
```

Generate a strong `AUTH_SECRET` quickly:

```bash
openssl rand -hex 32
```

### 4. Run locally

```bash
npm run dev
```

Open <http://localhost:3000> for the public portfolio, and <http://localhost:3000/admin> for the admin login.

## Deploying to Vercel

1. **Push the code to GitHub.** Initialize a repo and push.

   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:<you>/<repo>.git
   git push -u origin main
   ```

2. **Import the project to Vercel.**
   - Go to <https://vercel.com/new>.
   - Pick your repository and accept the defaults (Next.js will be auto-detected).
   - Before clicking **Deploy**, expand **Environment Variables** and add all of these (same values as your `.env.local`):
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
     - `CLOUDINARY_FOLDER`
     - `ADMIN_PASSWORD`
     - `AUTH_SECRET`
   - Click **Deploy**. You'll get a `*.vercel.app` URL within ~1 minute.

3. **Visit your live site.** Sign in at `/admin`, then upload your work.

### Custom domain (optional)

In Vercel → your project → **Settings** → **Domains**, add your domain and follow Vercel's DNS instructions.

## Project structure

```
src/
├── app/
│   ├── admin/                  # Login + protected dashboard
│   │   ├── dashboard/          # Upload + delete UI (server + client)
│   │   ├── LoginForm.tsx
│   │   └── page.tsx
│   ├── api/
│   │   ├── login/route.ts      # Password check, sets HMAC cookie
│   │   ├── logout/route.ts
│   │   └── media/route.ts      # GET / POST (upload) / DELETE
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Public homepage
├── components/
│   ├── MediaGrid.tsx           # Grid + lightbox modal
│   ├── SiteFooter.tsx
│   └── SiteHeader.tsx
└── lib/
    ├── auth.ts                 # HMAC-signed cookie session
    └── cloudinary.ts           # Cloudinary helpers (list/upload/delete)
```

## How auth works

- The admin password is checked on the server in `/api/login`.
- If correct, the server sets an HTTP-only cookie containing a value of the form `<expires-at>.<hmac>` signed with `AUTH_SECRET`.
- Every protected route (and the dashboard page) re-verifies the signature via `isAuthenticated()` in `src/lib/auth.ts`.
- Sessions expire after **7 days**.

If you ever need to invalidate every session immediately (for example, you suspect your password was leaked), simply rotate `AUTH_SECRET` in your environment variables — every existing cookie becomes invalid.

## Notes & tips

- **Upload size:** Server actions/route handlers are configured for up to 100 MB per file in `next.config.ts`. Vercel's default request body limit on the Hobby plan is also generous, but for very large videos consider Cloudinary's direct-upload widget.
- **Caching:** The homepage uses `revalidate = 30`, so newly uploaded media appears within ~30 seconds for public visitors. The admin dashboard uses `force-dynamic` so changes appear immediately for the owner.
- **Folder organization:** Everything is uploaded to the `CLOUDINARY_FOLDER` you configured. You can also organize media inside Cloudinary's UI; sub-folders aren't shown in the gallery (intentionally — every asset in the folder is part of the portfolio).

## Scripts

| Command         | Purpose                            |
| --------------- | ---------------------------------- |
| `npm run dev`   | Start the dev server on port 3000  |
| `npm run build` | Production build                   |
| `npm run start` | Start the production server        |

## License

Personal use. Customize as you like.
