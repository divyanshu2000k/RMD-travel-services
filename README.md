# R.M.D Travels website

## Folder layout
```
rmd-travels/
├── index.html        page
├── index.css         styles (desktop + mobile)
├── index.js          search, animations, image zoom
├── package.json
├── backend/server.js Node + Express API (also serves the site)
├── data/schedule.json bus timetable
└── pictures/         put your images here
```

## Run it
```
npm install
npm start
```
Open http://localhost:3000

## Test on your phone
1. Phone and laptop on the same Wi-Fi.
2. Find your laptop's IP (`ipconfig` on Windows, `ifconfig` / `ip a` on Mac/Linux), e.g. 192.168.1.5
3. On the phone open http://192.168.1.5:3000

Opening index.html directly (without the server) also works — the bus search falls back to the built-in timetable.

Icons come from Remix Icon (loaded from the jsDelivr CDN), so the page needs internet for icons to show.
