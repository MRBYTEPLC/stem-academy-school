
# STEM Academy Deployment Package

## Included
- index.html
- css/styles.css
- js/app.js
- js/app.obfuscated.js
- assets/sounds/
- README.md

## Recommended Hosting

### GitHub Pages
1. Create repository
2. Upload all files
3. Settings → Pages
4. Deploy from branch → main → /(root)

### Netlify
Drag and drop the folder into:
https://app.netlify.com/drop

### Cloudflare Pages
Create project and connect GitHub repository.

## IMPORTANT
The file app.obfuscated.js is partially protected.
For stronger protection:
https://obfuscator.io

## Suggested Firebase Features
- Real online counter
- Leaderboard
- Multi-user sessions
- Progress save

Create:
firebase-config.js

Then initialize:
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "...",
  projectId: "...",
};

firebase.initializeApp(firebaseConfig);

