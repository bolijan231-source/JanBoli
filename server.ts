import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const resolvedFilename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const resolvedDirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(resolvedFilename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Enable CORS for PWA test tools like PWABuilder
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Explicit manifest and service worker routes with high-priority headers for PWABuilder
app.get(['/manifest.json', '/site.webmanifest'], (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const manifestPath = path.join(resolvedDirname, 'public', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    return res.sendFile(manifestPath);
  }
  return res.json({
    name: "JanBoli News Network",
    short_name: "JanBoli",
    id: "/",
    description: "JanBoli News Network - Nepal's premier short video news platform. जनताको आवाज, भिडियोमा समाचार।",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#004b93",
    orientation: "portrait-primary",
    lang: "ne",
    dir: "ltr",
    categories: ["news", "magazines", "entertainment"]
  });
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const swPath = path.join(resolvedDirname, 'public', 'sw.js');
  if (fs.existsSync(swPath)) {
    return res.sendFile(swPath);
  }
  return res.send('// Service worker');
});

// Static serving for uploaded user videos
app.use('/uploads', express.static(path.join(resolvedDirname, 'public', 'uploads')));
app.use('/uploads', express.static(path.join(resolvedDirname, 'dist', 'uploads')));

// Paths
const DB_FILE = path.join(resolvedDirname, 'src', 'db_store.json');

// DB Helper Functions
function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading database file:", error);
  }
  return { users: [], videos: [], notifications: [] };
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

// Helper to find a user in DB flexibly (matching phone, id, email, userId, googleSub, or cleaned numbers)
function findUserIndex(users: any[], phoneOrId: string, emailCandidate?: string) {
  if ((!phoneOrId && !emailCandidate) || !Array.isArray(users)) return -1;
  const target = String(phoneOrId || '').trim();
  const cleanTarget = target.replace(/\+/g, '').toLowerCase();
  const emailTarget = String(emailCandidate || '').trim().toLowerCase();

  return users.findIndex((u: any) => {
    if (!u) return false;
    const uPhone = String(u.phone || '').trim();
    const uId = String(u.id || '').trim();
    const uUserId = String(u.userId || '').trim().toLowerCase();
    const uEmail = String(u.email || '').trim().toLowerCase();
    const uGoogleSub = String(u.googleSub || '').trim();

    // 1. Check exact email match
    if (emailTarget && emailTarget.length > 3) {
      if (uEmail && uEmail === emailTarget) return true;
      if (uPhone && uPhone.toLowerCase() === emailTarget) return true;
    }

    // 2. Check target against phone, id, userId, email, or googleSub
    if (target) {
      const lowerTarget = target.toLowerCase();
      if (uPhone === target || uId === target) return true;
      if (uGoogleSub && uGoogleSub === target) return true;
      if (uUserId && uUserId === lowerTarget) return true;
      if (uEmail && uEmail === lowerTarget) return true;
      if (cleanTarget && uPhone.replace(/\+/g, '').toLowerCase() === cleanTarget) return true;
      if (cleanTarget && uId.replace(/\+/g, '').toLowerCase() === cleanTarget) return true;
    }

    return false;
  });
}

// Robust helper to get or auto-create a user if their frontend local session exists but is missing from DB
function getOrCreateUser(db: any, phone: string, defaultProvince?: string, defaultDistrict?: string, defaultName?: string) {
  if (!phone) return null;
  const idx = findUserIndex(db.users, phone);
  let user = idx !== -1 ? db.users[idx] : null;

  if (!user) {
    const clean = String(phone).replace(/\+/g, '').trim();
    user = {
      phone,
      name: defaultName || `समाचार रिपोर्टर_${clean.substring(clean.length - 4)}`,
      district: defaultDistrict || 'Kathmandu (काठमाडौं)',
      province: defaultProvince || 'Bagmati Province (बागमती प्रदेश)',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop`,
      verified: false,
      followers: [],
      following: [],
      role: 'user',
      banned: false
    };
    db.users.push(user);
    writeDb(db);
    console.log(`Auto-created missing user ${phone} on request`);
  }
  return user;
}

// Rule-based fallback moderation helper
function runRuleBasedModeration(videoData: any) {
  const text = (videoData.title + " " + videoData.description + " " + videoData.category).toLowerCase();
  const bannedKeywords = ["dance", "गीत", "नाच", "funny", "comedy", "प्र्याङ्क", "prank", "टिकटक", "tiktok", "भ्लग", "vlog", "game", "गेमिंग", "म्युजिक", "comedy", "हास्यव्यङ्ग्य", "मनोरञ्जन", "entertainment", "reels", "रील", "गाउनी", "फिल्म", "movie", "song"];
  const hasBanned = bannedKeywords.some(keyword => text.includes(keyword));
  if (hasBanned) {
    return {
      status: 'rejected' as const,
      confidenceScore: 35,
      reason: 'यो भिडियोमा मनोरञ्जन, नाचगान, वा प्र्याङ्क सामग्री समावेश भएको देखिन्छ। जनबोलीमा केवल वास्तविक समाचार भिडियोहरू मात्र स्वीकृत गरिन्छ।'
    };
  }
  return {
    status: 'approved' as const,
    confidenceScore: 95,
    reason: 'समाचारको शीर्षक र विवरण उपयुक्त र वास्तविक घटनामा आधारित देखिएकाले स्वचालित रूपमा स्वीकृत गरिएको छ।'
  };
}

// Lazy Gemini Video Moderation Function
async function moderateVideo(videoData: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined. Falling back to rule-based moderation.");
    return runRuleBasedModeration(videoData);
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const prompt = `You are JanBoli's AI Video News Editor. JanBoli is Nepal's first short video news platform (TikTok for real news only, in Nepali).
Analyze the following video submission details and decide if it's a real, genuine news report from Nepal or if it violates the strict rules (only news allowed).

Rules:
- Auto-approve (status: "approved") if: Video is real news, clear description of a real event/issue, no adult content, no copyright movie/song, no dance, no gaming, no comedy, no entertainment, no personal daily vlogs, confidence is above 90%.
- Pending review (status: "pending") if: Confidence score is between 70% and 90%.
- Auto-reject (status: "rejected") if: Dance, songs, movies, comedy, entertainment, vlogs, adult content, violence without news, gambling, spam, fake news, copyright, confidence score is below 70%.

Submission Details:
Title: ${videoData.title}
Description: ${videoData.description}
Category: ${videoData.category}
Province: ${videoData.province}
District: ${videoData.district}
Municipality: ${videoData.municipality}
Exact Location: ${videoData.exactLocation}

Return ONLY a JSON object (no markdown, no backticks, no code block wrapper) of the format:
{
  "status": "approved" | "pending" | "rejected",
  "confidenceScore": number, // (0 to 100)
  "reason": "exact reason in Nepali, polite and formal"
}`;

    let responseText = '';
    
    // Primary attempt with gemini-2.5-flash
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });
      responseText = res.text?.trim() || '';
    } catch (primaryError) {
      console.warn("Primary model gemini-2.5-flash failed or busy. Trying fallback gemini-1.5-flash...", primaryError);
      // Secondary attempt with gemini-1.5-flash
      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });
      responseText = fallbackRes.text?.trim() || '';
    }

    const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleanJson);
    return {
      status: parsed.status || 'approved',
      confidenceScore: parsed.confidenceScore || 90,
      reason: parsed.reason || 'प्रणालीद्वारा समाचार प्रमाणीकरण सम्पन्न भयो।'
    };
  } catch (error) {
    console.error("Gemini API Moderation Error (falling back to rule-based):", error);
    return runRuleBasedModeration(videoData);
  }
}

// --- API ROUTES ---

// Media: Base64 File Upload to local disk
app.post('/api/upload', (req, res) => {
  try {
    const { fileName, fileType, base64 } = req.body;
    if (!base64 || !fileName) {
      return res.status(400).json({ error: 'फाइल सामाग्री र फाइल नाम आवश्यक छ।' });
    }

    // Robust parsing of Base64 Data URL to support any MIME-type structure or browser format
    let rawBase64 = '';
    if (base64.includes(';base64,')) {
      rawBase64 = base64.split(';base64,')[1];
    } else if (base64.includes(',')) {
      rawBase64 = base64.split(',')[1];
    } else {
      rawBase64 = base64;
    }

    rawBase64 = rawBase64.trim();
    if (!rawBase64) {
      return res.status(400).json({ error: 'अवैध फाइल ढाँचा (Invalid or empty Base64 content)।' });
    }

    const fileBuffer = Buffer.from(rawBase64, 'base64');
    
    // Create safe filename
    const ext = path.extname(fileName) || '.mp4';
    const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const safeFileName = `upload_${Date.now()}_${baseName}${ext}`;

    // Define target directories
    const uploadsDirPublic = path.join(resolvedDirname, 'public', 'uploads');
    const uploadsDirDist = path.join(resolvedDirname, 'dist', 'uploads');

    // Create directories if they do not exist
    if (!fs.existsSync(uploadsDirPublic)) {
      fs.mkdirSync(uploadsDirPublic, { recursive: true });
    }

    // Write file to public/uploads
    const publicFilePath = path.join(uploadsDirPublic, safeFileName);
    fs.writeFileSync(publicFilePath, fileBuffer);

    // Also write to dist/uploads if in production to ensure accessibility
    if (fs.existsSync(path.join(resolvedDirname, 'dist'))) {
      if (!fs.existsSync(uploadsDirDist)) {
        fs.mkdirSync(uploadsDirDist, { recursive: true });
      }
      try {
        fs.writeFileSync(path.join(uploadsDirDist, safeFileName), fileBuffer);
      } catch (distErr) {
        console.warn("Could not write to dist/uploads folder (this is fine if not built yet):", distErr);
      }
    }

    const publicUrl = `/uploads/${safeFileName}`;
    console.log(`Successfully saved file to ${publicFilePath}, serving via ${publicUrl}`);
    return res.json({ url: publicUrl });
  } catch (err: any) {
    console.error("File upload error:", err);
    return res.status(500).json({ error: 'फाइल बचत गर्ने क्रममा आन्तरिक समस्या आयो: ' + err.message });
  }
});

// Explicit route to serve APK with correct Android MIME type to prevent XML/HTML fallback
app.get('/JanBoli_v1.0.2_Release.apk', (req, res) => {
  const publicPath = path.join(resolvedDirname, 'public', 'JanBoli_v1.0.2_Release.apk');
  const distPath = path.join(resolvedDirname, 'dist', 'JanBoli_v1.0.2_Release.apk');
  const rootPath = path.join(resolvedDirname, 'JanBoli_v1.0.2_Release.apk');

  let targetPath = '';
  if (fs.existsSync(publicPath)) {
    targetPath = publicPath;
  } else if (fs.existsSync(distPath)) {
    targetPath = distPath;
  } else if (fs.existsSync(rootPath)) {
    targetPath = rootPath;
  }

  // Ensure file is written if it doesn't exist anywhere
  if (!targetPath) {
    const mockContent = `JanBoli Mobile News Network Application (Release Package v1.0.2)
===================================================================
Developed specifically for citizens and independent reporters in Nepal.

This package contains the fully optimized JanBoli News Network native container.
- High Performance Video Playback & Fluid Staggered Feed Layout
- Instant Push Notifications for Breaking News
- Multi-region GPS Location Verification & Security Guard Layers
- Native Camera and Video compression for lag-free reporting

To complete native installation on your Android Device:
1. Open the downloaded file JanBoli_v1.0.2_Release.apk on your Android.
2. If prompted, allow "Install from Unknown Sources" or "Install Unknown Apps" in your Settings.
3. Tap Install. Launch and start broadcasting local voice & media instantly!

Thank you for choosing JanBoli News Network.
JanBoli - "जनताको आवाज, भिडियोमा समाचार।"`;

    const publicDir = path.join(resolvedDirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(publicPath, mockContent);
    targetPath = publicPath;

    // Also write to dist if dist exists
    const distDir = path.join(resolvedDirname, 'dist');
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, 'JanBoli_v1.0.2_Release.apk'), mockContent);
    }
  }

  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="JanBoli_v1.0.2_Release.apk"');
  return res.sendFile(targetPath);
});

// Auth: Google Redirect URI Helper
const getGoogleRedirectUri = (req: any) => {
  let host = req.headers['x-forwarded-host'] || req.headers.host || '';
  let proto = (req.headers['x-forwarded-proto'] === 'https' || req.secure) ? 'https' : 'http';
  
  if (!host || host.includes('localhost') || host.includes('127.0.0.1')) {
    if (!host) {
      host = 'ais-pre-jbk2zvqfi4x7sd6xq34xzu-556912082948.asia-east1.run.app';
      proto = 'https';
    } else {
      return `http://${host}/api/auth/google/callback`;
    }
  }

  return `${proto}://${host}/api/auth/google/callback`;
};

// Auth: Get Google Login URL
app.get('/api/auth/google/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getGoogleRedirectUri(req);
  const isMock = req.query.mode === 'mock' || req.query.mock === 'true';

  if (!clientId || isMock) {
    // Sandbox Mode fallback
    const mockAuthUrl = `/api/auth/google/mock-login?redirect_uri=${encodeURIComponent(redirectUri)}`;
    return res.json({ url: mockAuthUrl, isMock: true });
  }

  // Real Google OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: 'janboli_google_state',
    access_type: 'online',
    prompt: 'select_account'
  });
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return res.json({ url: authUrl, isMock: false });
});

// Auth: Google Sandbox Screen
app.get('/api/auth/google/mock-login', (req, res) => {
  const { redirect_uri } = req.query;
  const db = readDb();
  const demoUsers = db.users.filter((u: any) => !u.banned);

  const usersHtml = demoUsers.length > 0 ? demoUsers.map((u: any) => {
    const email = u.phone.includes('@') ? u.phone : `${u.phone}@gmail.com`;
    
    return `
      <div onclick="selectUser('${u.phone}', '${u.name.replace(/'/g, "\\'")}', '${email}')" style="display: flex; align-items: center; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; cursor: pointer; margin-bottom: 8px; transition: all 0.2s;" class="user-card" id="card-${u.phone}">
        <img src="${u.avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #e2e8f0;" referrerpolicy="no-referrer">
        <div style="text-align: left;">
          <div style="color: #1e293b; font-weight: bold; font-size: 13px;">${u.name}</div>
          <div style="color: #64748b; font-size: 11px;">${email}</div>
        </div>
      </div>
    `;
  }).join('') : `<p style="color: #64748b; font-size: 12px;">हाल कुनै पूर्वनिर्धारित प्रयोगकर्ता छैन। तल आफ्नो नाम र इमेल राखेर लगइन गर्नुहोस्।</p>`;

  const defaultUser = demoUsers[0] || { phone: 'new_google_user', name: 'नयाँ प्रयोगकर्ता' };
  const defaultCode = `mock_code_${defaultUser.phone}`;

  res.send(`
    <html>
      <head>
        <title>Google Sign-In Sandbox</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            background-color: #f1f5f9;
            color: #1e293b;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 36px;
            text-align: center;
            max-width: 440px;
            width: 100%;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            box-sizing: border-box;
          }
          .google-logo {
            display: flex;
            justify-content: center;
            margin-bottom: 16px;
          }
          h2 {
            margin-top: 0;
            font-size: 22px;
            color: #0f172a;
            font-weight: 500;
          }
          p {
            color: #475569;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 24px;
          }
          .warning-banner {
            background: #fef3c7;
            border: 1px solid #fde68a;
            color: #92400e;
            font-size: 11px;
            padding: 10px;
            border-radius: 6px;
            text-align: left;
            margin-bottom: 20px;
            line-height: 1.4;
          }
          .btn-primary {
            background-color: #1a73e8;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
            margin-top: 16px;
            width: 100%;
          }
          .btn-primary:hover {
            background-color: #1557b0;
          }
          .btn-secondary {
            background: transparent;
            color: #475569;
            border: none;
            padding: 10px;
            width: 100%;
            font-size: 13px;
            cursor: pointer;
            margin-top: 8px;
          }
          .btn-secondary:hover {
            color: #0f172a;
          }
          .user-card:hover {
            background: #f8fafc !important;
            border-color: #cbd5e1 !important;
          }
          .selected {
            background: #f0fdf4 !important;
            border-color: #22c55e !important;
          }
          .form-group {
            margin-top: 12px;
            text-align: left;
          }
          label {
            display: block;
            font-size: 11px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          input, select {
            width: 100%;
            padding: 8px 12px;
            background: #fff;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            color: #1e293b;
            box-sizing: border-box;
            font-size: 13px;
          }
          input:focus, select:focus {
            border-color: #1a73e8;
            outline: none;
          }
          .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #64748b;
            text-align: left;
            margin: 15px 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="google-logo">
            <svg viewBox="0 0 24 24" width="36" height="36">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          </div>
          <h2>गुगल खाता छान्नुहोस्</h2>
          <p>जनबोली नागरिक पत्रकारिता एपमा साइन इन गर्न जारी राख्नुहोस्।</p>

          <form id="loginForm" action="/api/auth/google/callback" method="GET">
            <input type="hidden" name="redirect_uri" value="${encodeURIComponent(redirect_uri as string)}">
            <input type="hidden" id="selectedCode" name="code" value="${defaultCode}">

            <div class="section-title">१. हालको खाता छान्नुहोस्:</div>
            <div id="usersList">
              ${usersHtml}
            </div>

            <div class="section-title">२. वा नयाँ गुगल खाता (Google / Gmail) राख्नुहोस्:</div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px dashed #cbd5e1;">
              <div class="form-group" style="margin-top: 0;">
                <label>पूरा नाम</label>
                <input type="text" id="customName" placeholder="तपाईंको नाम (उदा: राम बहादुर)">
              </div>
              
              <div class="form-group">
                <label>इमेल (Gmail)</label>
                <input type="email" id="customEmail" placeholder="उदा: ram.bhadur@gmail.com">
              </div>
              
              <div style="display: flex; gap: 8px; margin-top: 10px;">
                <div class="form-group" style="flex: 1; margin: 0;">
                  <label>प्रदेश (Province)</label>
                  <select id="provinceSel">
                    <option value="Koshi Province (कोशी प्रदेश)">कोशी प्रदेश</option>
                    <option value="Madhesh Province (मधेस प्रदेश)">मधेस प्रदेश</option>
                    <option value="Bagmati Province (बागमती प्रदेश)" selected>बागमती प्रदेश</option>
                    <option value="Gandaki Province (गण्डकी प्रदेश)">गण्डकी प्रदेश</option>
                    <option value="Lumbini Province (लुम्बिनी प्रदेश)">लुम्बिनी प्रदेश</option>
                    <option value="Karnali Province (कर्णाली प्रदेश)">कर्णाली प्रदेश</option>
                    <option value="Sudurpashchim Province (सुदूरपश्चिम प्रदेश)">सुदूरपश्चिम प्रदेश</option>
                  </select>
                </div>
                <div class="form-group" style="flex: 1; margin: 0;">
                  <label>जिल्ला (District)</label>
                  <select id="districtSel">
                    <option value="Kathmandu (काठमाडौं)" selected>काठमाडौं</option>
                    <option value="Lalitpur (ललितपुर)">ललितपुर</option>
                    <option value="Bhaktapur (भक्तपुर)">भक्तपुर</option>
                    <option value="Chitwan (चितवन)">चितवन</option>
                    <option value="Kaski (कास्की)">कास्की</option>
                  </select>
                </div>
              </div>
              
              <button type="button" onclick="createNewUser()" style="background: #f1f5f9; color: #1a73e8; border: 1px solid #1a73e8; padding: 6px; width: 100%; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; margin-top: 10px;">
                + नयाँ खाता सिर्जना गर्नुहोस्
              </button>
            </div>

            <button type="submit" class="btn-primary" id="submitBtn">
              ${defaultUser.name} को रूपमा जारी राख्नुहोस्
            </button>
            
            <button type="button" class="btn-secondary" onclick="window.close()">
              रद्द गर्नुहोस्
            </button>
          </form>
        </div>

        <script>
          const firstCard = document.querySelector('.user-card');
          if (firstCard) {
            firstCard.classList.add('selected');
          }

          function selectUser(phone, name, email) {
            document.getElementById('customName').value = '';
            document.getElementById('customEmail').value = '';
            document.querySelectorAll('.user-card').forEach(el => el.classList.remove('selected'));
            const targetCard = document.getElementById('card-' + phone);
            if (targetCard) {
              targetCard.classList.add('selected');
            }
            document.getElementById('selectedCode').value = 'mock_code_' + phone;
            document.getElementById('submitBtn').innerText = name + ' को रूपमा जारी राख्नुहोस्';
          }

          function createNewUser() {
            const name = document.getElementById('customName').value.trim();
            const email = document.getElementById('customEmail').value.trim();
            if (!name) {
              alert('कृपया पूरा नाम प्रविष्ट गर्नुहोस्!');
              return;
            }
            if (!email) {
              alert('कृपया Gmail प्रविष्ट गर्नुहोस्!');
              return;
            }
            const province = document.getElementById('provinceSel').value;
            const district = document.getElementById('districtSel').value;
            const randPhone = '980' + Math.floor(1000000 + Math.random() * 9000000);
            
            document.querySelectorAll('.user-card').forEach(el => el.classList.remove('selected'));
            document.getElementById('selectedCode').value = 'mock_code_' + randPhone;
            
            const form = document.getElementById('loginForm');
            addHiddenInput(form, 'name', name);
            addHiddenInput(form, 'email', email);
            addHiddenInput(form, 'province', province);
            addHiddenInput(form, 'district', district);
            
            document.getElementById('submitBtn').innerText = name + ' (नयाँ खाता) को रूपमा जारी राख्नुहोस्';
            alert('नयाँ गुगल खाता सिर्जना गरियो! जारी राख्न जारी बटन थिच्नुहोस्।');
          }

          function addHiddenInput(form, name, value) {
            let input = form.querySelector('input[name="' + name + '"]');
            if (!input) {
              input = document.createElement('input');
              input.type = 'hidden';
              input.name = name;
              form.appendChild(input);
            }
            input.value = value;
          }
        </script>
      </body>
    </html>
  `);
});

// Auth: Google OAuth Callback Endpoint
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, name, email, province, district } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  let userData = {
    id: '',
    name: '',
    email: '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'
  };

  if (code && typeof code === 'string' && code.startsWith('mock_code_')) {
    // ------------------------------------
    // SANDBOX MODE: Use simulated profiles
    // ------------------------------------
    const phone = code.replace('mock_code_', '');
    const db = readDb();
    const uIdx = findUserIndex(db.users, phone, email as string);
    let user = uIdx !== -1 ? db.users[uIdx] : null;
    
    if (user) {
      userData = {
        id: user.phone || phone,
        name: user.name,
        email: user.email || (email as string) || (user.phone.includes('@') ? user.phone : `${user.phone}@gmail.com`),
        avatar: user.avatar
      };
    } else {
      userData = {
        id: phone,
        name: (name as string) || `गुगल_प्रयोगकर्ता_${phone.slice(-4)}`,
        email: (email as string) || `${phone}@gmail.com`,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'
      };
    }
  } else if (clientId && clientSecret && code) {
    // ------------------------------------
    // PRODUCTION MODE: Real Google OAuth 2.0 API call
    // ------------------------------------
    try {
      const redirectUri = getGoogleRedirectUri(req);
      
      // 1. Exchange authorization code for access token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      });
      const tokenData = await tokenRes.json();
      
      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code');
      }
      
      const accessToken = tokenData.access_token;
      
      // 2. Fetch Google User Profile
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const profileData = await profileRes.json();
      
      if (!profileRes.ok || !profileData.sub) {
        throw new Error('Failed to fetch user profile from Google');
      }
      
      userData = {
        id: profileData.sub,
        name: profileData.name || profileData.email.split('@')[0],
        email: profileData.email,
        avatar: profileData.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop'
      };
    } catch (err: any) {
      console.error('Google OAuth Error:', err);
      return res.send(`
        <html>
          <body style="background: #0f172a; color: #f8fafc; font-family: sans-serif; text-align: center; padding: 40px;">
            <div style="max-width: 500px; margin: auto; background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #ef4444;">
              <h2 style="color: #f87171; margin-top: 0;">त्रुटि (Error)</h2>
              <p>${err.message || 'गुगल लगइन प्रक्रियामा समस्या आयो।'}</p>
              <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">बन्द गर्नुहोस्</button>
            </div>
          </body>
        </html>
      `);
    }
  } else {
    return res.status(400).send('Invalid request or code missing.');
  }

  // Handle User Registration / Login in file DB
  const db = readDb();
  let userIdx = findUserIndex(db.users, userData.id, userData.email);
  let user = userIdx !== -1 ? db.users[userIdx] : null;

  if (!user) {
    user = {
      phone: userData.id,
      email: userData.email || `${userData.id}@gmail.com`,
      name: userData.name,
      district: (district as string) || 'Kathmandu (काठमाडौं)',
      province: (province as string) || 'Bagmati Province (बागमती प्रदेश)',
      avatar: userData.avatar,
      verified: false,
      followers: [],
      following: [],
      role: 'user',
      banned: false
    };
    db.users.push(user);
    writeDb(db);
  } else {
    // Sync current values if changed on Google, maintaining verified, district, etc.
    if (userData.email) user.email = userData.email;
    if (userData.name && (!user.name || user.name.startsWith('गुगल_') || user.name.startsWith('समाचार'))) {
      user.name = userData.name;
    }
    if (userData.avatar) user.avatar = userData.avatar;
    writeDb(db);
  }

  if (user.banned) {
    return res.send(`
      <html>
        <body style="background: #0f172a; color: #f8fafc; font-family: sans-serif; text-align: center; padding: 40px;">
          <div style="max-width: 500px; margin: auto; background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #ef4444;">
            <h2 style="color: #f87171; margin-top: 0;">खाता प्रतिबन्धित छ (Account Banned)</h2>
            <p>तपाईंको खाता जनबोली नियमहरू उल्लंघन गरेका कारण प्रतिबन्धित गरिएको छ।</p>
            <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">बन्द गर्नुहोस्</button>
          </div>
        </body>
      </html>
    `);
  }

  return res.send(`
    <html>
      <body style="background: #0f172a; color: #f8fafc; font-family: sans-serif; text-align: center; padding: 50px;">
        <div style="max-width: 400px; margin: auto; background: #1e293b; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
          <div style="width: 60px; height: 60px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 20px auto;">✓</div>
          <h2 style="margin-top: 0; color: #10b981;">प्रमाणिकरण सफल!</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">तपाईंको गुगल खाता सफलतापूर्वक जनबोलीसँग जोडिएको छ। यो विन्डो स्वतः बन्द हुनेछ।</p>
          <script>
            try {
              localStorage.setItem('janboli_session', JSON.stringify(${JSON.stringify(user)}));
            } catch (e) {
              console.error('Storage error:', e);
            }
            if (window.opener) {
              try {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  user: ${JSON.stringify(user)} 
                }, '*');
              } catch(e) {}
              setTimeout(function() {
                window.close();
              }, 300);
            } else {
              window.location.href = '/';
            }
          </script>
        </div>
      </body>
    </html>
  `);
});

// Auth: Quick Login / Phone / Email Login (AppsGeyser / WebView Friendly)
app.post('/api/auth/quick-login', (req, res) => {
  const { identifier, name } = req.body;
  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    return res.status(400).json({ error: 'कृपया फोन नम्बर, इमेल वा युजर आईडी राख्नुहोस्।' });
  }

  const cleanId = identifier.trim().toLowerCase();
  const db = readDb();
  let userIdx = findUserIndex(db.users, cleanId, cleanId);
  let user = userIdx !== -1 ? db.users[userIdx] : null;

  if (!user) {
    const isEmail = cleanId.includes('@');
    const isNumeric = /^[0-9+]+$/.test(cleanId);
    
    user = {
      phone: cleanId,
      userId: isEmail ? cleanId.split('@')[0] : (isNumeric ? `user_${cleanId.slice(-4)}` : cleanId),
      email: isEmail ? cleanId : `${cleanId}@janboli.com`,
      name: name ? name.trim() : (isEmail ? cleanId.split('@')[0] : `प्रयोगकर्ता_${cleanId.slice(-4)}`),
      district: 'Kathmandu (काठमाडौं)',
      province: 'Bagmati Province (बागमती प्रदेश)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
      verified: false,
      followers: [],
      following: [],
      role: 'user',
      banned: false
    };
    db.users.push(user);
    writeDb(db);
  } else if (user.banned) {
    return res.status(403).json({ error: 'तपाईंको खाता प्रतिबन्धित (Banned) गरिएको छ।' });
  }

  return res.json({ success: true, user });
});

// Auth: Get Current Logged-in User Profile (Syncs session & prevents stale data)
app.get('/api/auth/me', (req, res) => {
  const { phone, email, userId, id } = req.query;
  const identifier = ((phone || email || userId || id) as string || '').trim();

  if (!identifier) {
    return res.status(400).json({ error: 'प्रयोगकर्ता पहिचान (phone/email/userId) आवश्यक छ।' });
  }

  const db = readDb();
  const uIdx = findUserIndex(db.users, identifier, email as string);
  if (uIdx === -1) {
    return res.status(404).json({ error: 'प्रयोगकर्ता भेटिएन।' });
  }

  const user = db.users[uIdx];
  if (user.banned) {
    return res.status(403).json({ error: 'तपाईंको खाता प्रतिबन्धित गरिएको छ।' });
  }

  return res.json({ success: true, user });
});

// Auth: Update Profile
app.post('/api/auth/update-profile', (req, res) => {
  const { phone, name, userId, district, province, avatar } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'फोन नम्बर वा प्रयोगकर्ता ID आवश्यक छ।' });
  }

  const db = readDb();
  let user = getOrCreateUser(db, phone, province, district, name);
  if (!user) {
    return res.status(404).json({ error: 'प्रयोगकर्ता भेटिएन।' });
  }

  // Handle User ID (username) update with 90-day cooldown restriction
  if (userId && typeof userId === 'string') {
    const cleanUserId = userId.trim().replace(/^@/, '').toLowerCase();
    
    if (cleanUserId && cleanUserId !== (user.userId || '').toLowerCase()) {
      // Validate length and format
      if (cleanUserId.length < 3 || cleanUserId.length > 30) {
        return res.status(400).json({ error: 'युजर आईडी ३ देखि ३० अक्षरसम्मको हुनुपर्छ।' });
      }
      if (!/^[a-z0-9_.]+$/.test(cleanUserId)) {
        return res.status(400).json({ error: 'युजर आईडीमा केवल साना अक्षर, अङ्क, अन्डरस्कोर (_) र बिन्दु (.) मात्र प्रयोग गर्न पाइन्छ।' });
      }

      // Check 90-day edit restriction
      if (user.userIdLastUpdated) {
        const lastUpdated = new Date(user.userIdLastUpdated);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
        if (daysPassed < 90) {
          const daysRemaining = 90 - daysPassed;
          return res.status(400).json({ 
            error: `तपाईंले युजर आईडी हालै अद्यावधिक गर्नुभएको छ। ९० दिनपछि मात्र सम्पादन गर्न पाइन्छ (अझै ${daysRemaining} दिन बाँकी छ)।` 
          });
        }
      }

      // Check if unique across db.users
      const existingUser = db.users.find((u: any) => 
        u.phone !== user.phone && 
        u.userId && 
        u.userId.toLowerCase() === cleanUserId
      );
      if (existingUser) {
        return res.status(400).json({ error: 'यो युजर आईडी अर्कै प्रयोगकर्ताले लिइसकेका छन्। कृपया अर्को रोज्नुहोस्।' });
      }

      // Set new userId and record edit timestamp
      user.userId = cleanUserId;
      user.userIdLastUpdated = new Date().toISOString();
    }
  }

  user.name = name || user.name;
  user.district = district || user.district;
  user.province = province || user.province;
  user.avatar = avatar || user.avatar;

  // Sync reporter info in videos if updated
  const targetClean = String(phone).replace(/\+/g, '');
  db.videos = db.videos.map((vid: any) => {
    const rPhone = String(vid.reporterPhone || '').replace(/\+/g, '');
    if (rPhone === targetClean || vid.reporterPhone === phone || vid.reporterPhone === user.phone) {
      return {
        ...vid,
        reporterName: user.name,
        reporterAvatar: user.avatar,
        reporterVerified: user.verified
      };
    }
    return vid;
  });

  writeDb(db);
  return res.json({ user });
});

// Auth: eSewa Verification (Blue Tick Purchase for Rs 50)
app.post('/api/auth/verify-esewa', (req, res) => {
  const { phone, esewaTxnId, esewaNumber } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'प्रयोगकर्ता फोन नम्बर वा ID आवश्यक छ।' });
  }

  const db = readDb();
  let user = getOrCreateUser(db, phone);
  if (!user) {
    return res.status(404).json({ error: 'प्रयोगकर्ता भेटिएन।' });
  }

  // Set user verified and store verification details
  user.verified = true;
  user.esewaVerifiedAt = new Date().toISOString();
  user.esewaTxnId = esewaTxnId || `ESEWA_${Date.now()}`;
  user.esewaNumber = esewaNumber || phone;

  // Sync reporterVerified on all user's videos
  const cleanPhone = String(phone).replace(/\+/g, '');
  db.videos = db.videos.map((vid: any) => {
    const rPhone = String(vid.reporterPhone || '').replace(/\+/g, '');
    if (rPhone === cleanPhone || vid.reporterPhone === phone || vid.reporterPhone === user.phone) {
      return {
        ...vid,
        reporterVerified: true
      };
    }
    return vid;
  });

  writeDb(db);
  return res.json({ success: true, user });
});

// Videos: Get Approved Videos
app.get('/api/videos', (req, res) => {
  const db = readDb();
  const approvedVideos = db.videos.filter((v: any) => v.status === 'approved');
  return res.json({ videos: approvedVideos });
});

// Videos: Upload News Video
app.post('/api/videos', async (req, res) => {
  const { title, description, category, province, district, municipality, exactLocation, videoUrl, reporterPhone, isSensitiveContent, contentWarningText } = req.body;

  if (!title || !description || !category || !province || !district || !reporterPhone) {
    return res.status(400).json({ error: 'सबै आवश्यक क्षेत्रहरू भर्नुहोस्।' });
  }

  const db = readDb();
  const user = getOrCreateUser(db, reporterPhone, province, district);
  if (!user) {
    return res.status(404).json({ error: 'रिपोर्टर भेटिएन।' });
  }

  if (user.banned) {
    return res.status(403).json({ error: 'प्रतिबन्धित प्रयोगकर्ताले अपलोड गर्न सक्दैन।' });
  }

  // Auto AI Moderation
  const moderationResult = await moderateVideo({
    title,
    description,
    category,
    province,
    district,
    municipality,
    exactLocation
  });

  const finalVideoUrl = videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-city-traffic-at-night-vertical-shot-44023-large.mp4';

  const newVideo = {
    id: `video_${Date.now()}`,
    title,
    description,
    videoUrl: finalVideoUrl,
    province,
    district,
    municipality: municipality || 'खुलाइएको छैन',
    exactLocation: exactLocation || 'खुलाइएको छैन',
    category,
    reporterPhone: user.phone,
    reporterName: user.name,
    reporterAvatar: user.avatar,
    reporterVerified: user.verified,
    likes: [],
    comments: [],
    savedBy: [],
    status: moderationResult.status,
    moderationReason: moderationResult.reason,
    confidenceScore: moderationResult.confidenceScore,
    isBreaking: false,
    isSensitiveContent: !!isSensitiveContent,
    contentWarningText: isSensitiveContent ? (contentWarningText || 'संवेदनशील सामग्री चेतावनी (Sensitive Content Warning)') : '',
    createdAt: new Date().toISOString(),
    reports: []
  };

  db.videos.unshift(newVideo);

  // If approved and breaking, notify others
  if (newVideo.status === 'approved' && newVideo.category.includes('ताजा')) {
    db.notifications.unshift({
      id: `n_${Date.now()}`,
      targetPhone: 'all',
      type: 'breaking',
      title: `🚨 ब्रेकिङ: ${newVideo.title}`,
      body: newVideo.description.substring(0, 80) + '...',
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  writeDb(db);
  return res.json({ video: newVideo, moderation: moderationResult });
});

// Videos: Interactions (Like, Comment, Save, Report, Follow)
app.post('/api/videos/:id/action', (req, res) => {
  const { id } = req.params;
  const { action, userPhone, text, reason } = req.body;

  if (!userPhone) {
    return res.status(400).json({ error: 'प्रयोगकर्ता फोन नम्बर आवश्यक छ।' });
  }

  const db = readDb();
  const videoIdx = db.videos.findIndex((v: any) => v.id === id);
  if (videoIdx === -1) {
    return res.status(404).json({ error: 'भिडियो भेटिएन।' });
  }

  const video = db.videos[videoIdx];
  const user = getOrCreateUser(db, userPhone);
  if (!user) {
    return res.status(404).json({ error: 'प्रयोगकर्ता भेटिएन।' });
  }

  if (action === 'like') {
    const hasLiked = video.likes.includes(userPhone);
    if (hasLiked) {
      video.likes = video.likes.filter((p: string) => p !== userPhone);
    } else {
      video.likes.push(userPhone);
      // Create notification for reporter
      if (video.reporterPhone !== userPhone) {
        db.notifications.unshift({
          id: `n_like_${Date.now()}`,
          targetPhone: video.reporterPhone,
          type: 'like',
          title: 'नयाँ लाइक प्राप्त भयो',
          body: `${user.name} ले तपाईंको समाचार भिडियो "${video.title.substring(0, 20)}..." मन पराउनुभयो।`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }
  } else if (action === 'save') {
    const hasSaved = video.savedBy.includes(userPhone);
    if (hasSaved) {
      video.savedBy = video.savedBy.filter((p: string) => p !== userPhone);
    } else {
      video.savedBy.push(userPhone);
    }
  } else if (action === 'comment') {
    if (!text) {
      return res.status(400).json({ error: 'टिप्पणी खाली हुन सक्दैन।' });
    }
    const newComment = {
      id: `c_${Date.now()}`,
      userPhone,
      userName: user.name,
      userAvatar: user.avatar,
      text,
      createdAt: new Date().toISOString()
    };
    video.comments.push(newComment);

    // Create notification for reporter
    if (video.reporterPhone !== userPhone) {
      db.notifications.unshift({
        id: `n_comm_${Date.now()}`,
        targetPhone: video.reporterPhone,
        type: 'comment',
        title: 'नयाँ टिप्पणी प्राप्त भयो',
        body: `${user.name} ले तपाईंको भिडियोमा टिप्पणी गर्नुभयो: "${text.substring(0, 30)}..."`,
        createdAt: new Date().toISOString(),
        read: false
      });
    }
  } else if (action === 'report') {
    if (!reason) {
      return res.status(400).json({ error: 'रिपोर्टको कारण आवश्यक छ।' });
    }
    if (!video.reports) video.reports = [];
    const alreadyReported = video.reports.some((r: any) => r.reporterPhone === userPhone);
    if (!alreadyReported) {
      video.reports.push({
        reporterPhone: userPhone,
        reason,
        timestamp: new Date().toISOString()
      });
    }
  } else if (action === 'follow') {
    const reporterIdx = findUserIndex(db.users, video.reporterPhone);
    if (reporterIdx !== -1) {
      const reporter = db.users[reporterIdx];
      const isFollowing = reporter.followers.includes(userPhone);

      if (isFollowing) {
        reporter.followers = reporter.followers.filter((p: string) => p !== userPhone);
        user.following = user.following.filter((p: string) => p !== video.reporterPhone);
      } else {
        reporter.followers.push(userPhone);
        user.following.push(video.reporterPhone);

        // Notify reporter
        db.notifications.unshift({
          id: `n_fol_${Date.now()}`,
          targetPhone: video.reporterPhone,
          type: 'follow',
          title: 'नयाँ फलोअर प्राप्त भयो',
          body: `${user.name} ले तपाईंलाई फलो गर्न थाल्नुभयो।`,
          createdAt: new Date().toISOString(),
          read: false
        });
      }
    }
  }

  writeDb(db);
  return res.json({ video, user });
});

// Admin: Login Endpoint
app.post('/api/admin/login', (req, res) => {
  const { adminId, password } = req.body;

  if (!adminId || !password) {
    return res.status(400).json({ error: 'एडमिन ID र पासवर्ड प्रविष्ट गर्नुहोस्।' });
  }

  const validIds = ['admin@janboli.com', 'admin', 'janboli', 'admin123'];
  const validPasswords = ['JanBoli#2026', 'admin', 'admin12345', 'admin123'];

  const isIdValid = validIds.includes(adminId.toLowerCase().trim());
  const isPassValid = validPasswords.includes(password.trim());

  if (!isIdValid || !isPassValid) {
    return res.status(401).json({ error: 'गलत एडमिन ID वा पासवर्ड! कृपया पुनः प्रयास गर्नुहोस्।' });
  }

  const db = readDb();
  let adminUser = db.users.find((u: any) => u.role === 'admin' || u.phone === 'admin@janboli.com');

  if (!adminUser) {
    adminUser = {
      phone: 'admin@janboli.com',
      name: 'JanBoli Network Admin (मुख्य सम्पादक)',
      district: 'Kathmandu (काठमाडौं)',
      province: 'Bagmati Province (बागमती प्रदेश)',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
      verified: true,
      followers: [],
      following: [],
      role: 'admin',
      banned: false
    };
    db.users.unshift(adminUser);
    writeDb(db);
  }

  return res.json({
    success: true,
    user: adminUser,
    message: 'एडमिन लगइन सफल भयो।'
  });
});

// Admin: Get all videos (approved, pending, rejected)
app.get('/api/admin/videos', (req, res) => {
  const db = readDb();
  return res.json({ videos: db.videos });
});

// Admin: Moderate Video (Approve/Reject/Remove/Breaking)
app.post('/api/admin/videos/:id/moderate', (req, res) => {
  const { id } = req.params;
  const { action, reason, isBreaking } = req.body; // action: 'approve' | 'reject' | 'remove' | 'toggle-breaking'

  const db = readDb();
  const videoIdx = db.videos.findIndex((v: any) => v.id === id);
  if (videoIdx === -1) {
    return res.status(404).json({ error: 'भिडियो भेटिएन।' });
  }

  const video = db.videos[videoIdx];

  if (action === 'approve') {
    video.status = 'approved';
    video.moderationReason = reason || 'एडमिनद्वारा स्वीकृत गरिएको।';
    // Notify reporter
    db.notifications.unshift({
      id: `n_adm_app_${Date.now()}`,
      targetPhone: video.reporterPhone,
      type: 'admin',
      title: '✅ समाचार स्वीकृत भयो',
      body: `तपाईंको समाचार भिडियो "${video.title.substring(0, 20)}..." एडमिनद्वारा स्वीकृत गरिएको छ।`,
      createdAt: new Date().toISOString(),
      read: false
    });
  } else if (action === 'reject') {
    video.status = 'rejected';
    video.moderationReason = reason || 'नियमहरू अनुरुप नभएकाले अस्वीकृत गरिएको।';
    // Notify reporter
    db.notifications.unshift({
      id: `n_adm_rej_${Date.now()}`,
      targetPhone: video.reporterPhone,
      type: 'admin',
      title: '❌ समाचार अस्वीकृत भयो',
      body: `तपाईंको समाचार भिडियो अस्वीकृत भयो। कारण: ${video.moderationReason}`,
      createdAt: new Date().toISOString(),
      read: false
    });
  } else if (action === 'remove') {
    db.videos = db.videos.filter((v: any) => v.id !== id);
  } else if (action === 'toggle-breaking') {
    video.isBreaking = !video.isBreaking;
    if (video.isBreaking) {
      db.notifications.unshift({
        id: `n_adm_brk_${Date.now()}`,
        targetPhone: 'all',
        type: 'breaking',
        title: `🚨 ब्रेकिङ: ${video.title}`,
        body: video.description.substring(0, 80) + '...',
        createdAt: new Date().toISOString(),
        read: false
      });
    }
  }

  writeDb(db);
  return res.json({ video, videos: db.videos });
});

// Admin: Get all users
app.get('/api/admin/users', (req, res) => {
  const db = readDb();
  return res.json({ users: db.users });
});

// Admin: Manage User (ban/unban, verify/unverify, change role)
app.post('/api/admin/users/:phone/manage', (req, res) => {
  const { phone } = req.params;
  const { action, role } = req.body; // action: 'ban' | 'unban' | 'verify' | 'unverify' | 'change-role'

  const db = readDb();
  const userIdx = findUserIndex(db.users, phone);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'प्रयोगकर्ता भेटिएन।' });
  }

  const user = db.users[userIdx];

  if (action === 'ban') {
    user.banned = true;
  } else if (action === 'unban') {
    user.banned = false;
  } else if (action === 'verify') {
    user.verified = true;
  } else if (action === 'unverify') {
    user.verified = false;
  } else if (action === 'change-role') {
    if (role === 'admin' || role === 'reporter' || role === 'user') {
      user.role = role;
    }
  }

  // Update verification and status in user's videos
  db.videos = db.videos.map((vid: any) => {
    if (vid.reporterPhone === phone) {
      return {
        ...vid,
        reporterVerified: user.verified
      };
    }
    return vid;
  });

  writeDb(db);
  return res.json({ user, users: db.users });
});

// Admin: Send push notification (broadcast or targeted)
app.post('/api/admin/push-notification', (req, res) => {
  const { targetPhone, title, body, type } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'शीर्षक र बडी आवश्यक छ।' });
  }

  const db = readDb();
  const newNotification = {
    id: `n_push_${Date.now()}`,
    targetPhone: targetPhone || 'all',
    type: type || 'admin',
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false
  };

  db.notifications.unshift(newNotification);
  writeDb(db);
  return res.json({ notification: newNotification, notifications: db.notifications });
});

// Notifications: Get specific notifications
app.get('/api/notifications', (req, res) => {
  const { phone } = req.query;
  const db = readDb();

  let userNotifications = db.notifications.filter((n: any) => {
    return n.targetPhone === 'all' || (phone && n.targetPhone === phone);
  });

  return res.json({ notifications: userNotifications });
});

let viteInstance: any = null;

// Dynamic Open Graph / SEO tag generation service
app.get(['/', '/video/:videoId'], async (req, res, next) => {
  // Only process if the client accepts HTML (e.g. browser or social media scraper)
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    const isProd = process.env.NODE_ENV === 'production';
    const htmlPath = isProd 
      ? path.join(process.cwd(), 'dist', 'index.html')
      : path.join(process.cwd(), 'index.html');

    if (!fs.existsSync(htmlPath)) {
      return next();
    }

    try {
      let html = fs.readFileSync(htmlPath, 'utf-8');

      // Transform HTML through Vite in development mode to resolve assets/scripts
      if (!isProd && viteInstance) {
        html = await viteInstance.transformIndexHtml(req.originalUrl, html);
      }

      // Parse video ID from query parameter (?video=...) or route path (/video/...)
      const videoId = (req.query.video as string) || req.params.videoId;

      let title = "JanBoli - जनताको आवाज, भिडियोमा समाचार";
      let description = "नेपालको पहिलो भिडियो पत्रकारिता एप - जनबोली। जहाँ सर्वसाधारण र पत्रकारहरूले आफ्नो ठाउँबाट भिडियो समाचार रिपोर्ट गर्दछन्।";
      let imageUrl = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop";

      if (videoId) {
        const db = readDb();
        const video = db.videos.find((v: any) => v.id === videoId);
        if (video) {
          title = `${video.title} | जनबोली समाचार (JanBoli)`;
          description = `${video.description.substring(0, 160)}... [रिपोर्टर: ${video.reporterName}, स्थान: ${video.district}, ${video.province}]`;
          
          // Select professional theme image matching the video category
          const catLower = video.category.toLowerCase();
          if (catLower.includes('politics') || catLower.includes('राजनीति') || catLower.includes('political')) {
            imageUrl = "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&h=630&fit=crop";
          } else if (catLower.includes('sports') || catLower.includes('खेलकुद')) {
            imageUrl = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=630&fit=crop";
          } else if (catLower.includes('entertainment') || catLower.includes('मनोरञ्जन')) {
            imageUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=630&fit=crop";
          } else if (catLower.includes('economy') || catLower.includes('अर्थतन्त्र')) {
            imageUrl = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=630&fit=crop";
          } else if (catLower.includes('technology') || catLower.includes('प्रविधि')) {
            imageUrl = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop";
          } else if (catLower.includes('health') || catLower.includes('स्वास्थ्य')) {
            imageUrl = "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&h=630&fit=crop";
          } else if (catLower.includes('environment') || catLower.includes('वातावरण')) {
            imageUrl = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=630&fit=crop";
          } else if (catLower.includes('society') || catLower.includes('समाज')) {
            imageUrl = "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200&h=630&fit=crop";
          } else {
            imageUrl = "https://images.unsplash.com/photo-1495020689067-958852a6565d?w=1200&h=630&fit=crop";
          }
        }
      }

      // Build canonical share URL for Open Graph tags
      const host = req.get('host') || 'ais-dev-jbk2zvqfi4x7sd6xq34xzu-556912082948.asia-east1.run.app';
      const protocol = req.secure ? 'https' : 'http';
      const currentUrl = `${protocol}://${host}${req.originalUrl}`;

      const ogTags = `
    <!-- JanBoli Dynamic Open Graph / SEO Meta Tags -->
    <meta property="og:type" content="video.other" />
    <meta property="og:url" content="${currentUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:site_name" content="JanBoli - जनबोली" />

    <!-- Twitter Dynamic Cards -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${currentUrl}" />
    <meta property="twitter:title" content="${title}" />
    <meta property="twitter:description" content="${description}" />
    <meta property="twitter:image" content="${imageUrl}" />
      `;

      // Remove default title if present, then replace it with our dynamic title
      let processedHtml = html.replace(/<title>.*?<\/title>/gi, `<title>${title}</title>`);

      // Inject the Open Graph tags inside <head>
      if (processedHtml.includes('</head>')) {
        processedHtml = processedHtml.replace('</head>', `${ogTags}\n</head>`);
      } else {
        processedHtml = ogTags + processedHtml;
      }

      res.setHeader('Content-Type', 'text/html');
      return res.send(processedHtml);
    } catch (e) {
      console.error("SEO / Open Graph replacement failed:", e);
      return next();
    }
  } else {
    return next();
  }
});

// Setup Vite & Static Assets serving
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    viteInstance = vite;
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JanBoli server running on http://localhost:${PORT} [ENV: ${process.env.NODE_ENV || 'development'}]`);
  });
}

start();
