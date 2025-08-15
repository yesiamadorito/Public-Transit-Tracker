# LRT Timing App – MVP v0.0

## Why I Built This
When I used to live in Kuala Lumpur, my daily commute often involved the LRT, Monorail, and sometimes the MRT. I noticed something curious: at certain stations, the train doors stayed open much longer than usual. Salak Selatan was one that stood out.

Out of curiosity, I started timing my journeys. I’d use my phone’s stopwatch, hitting “lap” for every station, and noting when doors opened and closed. I added up the times and wrote them in my diary.  

It didn’t take long to realise that while this was interesting, it was way too time consuming to do every single trip. My first thought was to build a small IoT device using an ESP32, GPS module, and a couple of buttons to log events. But then I thought about it… why not just use my phone? It already has GPS, sensors, and a screen.  

That’s how the idea for this app was born.

---

## Version 0.0 – MVP
This is not the final product, just the first working version. My goal was to create something functional enough to log an entire trip without me juggling multiple tools.

**What it does right now:**
- Start and end journey tracking (Automatically picks the nearest station, from the existing library of stations in stations.json - this is a WIP and I'll be adding more later)
- Log door open and door close events for each station
- Automatically fetch weather data for the current location
- Store all data in Firebase for later analysis

It’s rough, but it works. I can now run the app while commuting and get structured data without manual stopwatches or pen and paper.

Here's what it looks like:

<img width="540" height="1170" alt="image" src="https://github.com/user-attachments/assets/9540aea3-8c2f-42b6-b08f-2d5557c620d5" />

---

## What’s Coming in v0.1
The next version will focus on making the app more user-friendly and efficient:
- User login system (email and password)
- Smarter weather API calls to save request limits
- Export data as CSV for analysis
- A cleaner, more intuitive UI

---

This project is still early in its life, but I’m sharing it now because I’d love feedback, suggestions, and even collaboration from anyone who’s built transport tracking tools or mobile apps before.  

📂 **Repository link:** You’re already here 🙂  
💬 Feel free to open an issue or drop me a message me on [LinkedIn](https://www.linkedin.com/in/rohitudhwani) or email me at rohit_udhwani@hotmail.com if you’ve got ideas!
