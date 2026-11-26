# The Golden Sip website

A static website (plain HTML, CSS and JavaScript, no build step).

## Files
- `index.html`: page structure and icons
- `styles.css`: all styling
- `app.js`: menu, cart, WhatsApp ordering, Instagram QR page, owner dashboard
- `menu.json`: the live menu (dishes, prices, categories, contact phone, UPI ID)
- `assets/`: logo, Instagram QR and cafe photos

## Deploy with GitHub Pages
1. Create a GitHub repository and upload all of these files, keeping the `assets` folder.
2. Open the repository, then Settings, then Pages.
3. Under Build and deployment, choose Deploy from a branch, pick `main` and `/ (root)`, then Save.
4. After a minute your site is live at `https://<your-username>.github.io/<repository>/`.

Netlify and Vercel also work: import the repository, leave the build command empty and the publish directory as the root.

## Changing the menu
1. Open your site, then go to the Owner page (`#owner`) and sign in.
2. Change prices, availability, dishes, categories, the contact phone or the UPI ID. These edits are saved on that device only.
3. Tap Download menu.json.
4. In GitHub, replace `menu.json` with the downloaded file (Add file, Upload files, commit). Guests see the new menu after the host redeploys, usually within a minute.

## Notes
- The Owner login is a screen inside the page. It keeps casual visitors out but is not strong security. Do not store anything secret in this site.
- Orders are sent as a WhatsApp message to the phone number in `menu.json`.
- Opening hours text (10 AM to 4 AM) is in `app.js` and `index.html`; search for "10 AM".
- Test locally with `python3 -m http.server` and open http://localhost:8000 (opening index.html directly will not load `menu.json`).
