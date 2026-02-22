# DMS PRINTER CLIENT - QUICK SETUP GUIDE
## For PC Technicians and End Users

---

## 📋 WHAT YOU NEED

✅ Windows PC with USB port  
✅ Brother label printer (PT-P710BT or similar)  
✅ USB cable connecting printer to PC  
✅ Printer driver installed  
✅ Internet connection  
✅ Node.js installed (from https://nodejs.org)  

---

## 🚀 QUICK INSTALLATION (5 Minutes)

### Step 1: Copy Files
Copy the `printer` folder to the PC (e.g., Desktop or C:\DMS-Printer)

### Step 2: Install
1. Open the printer folder
2. Double-click `install.bat`
3. Wait 2-5 minutes for installation
4. When done, you'll see "INSTALLATION COMPLETE"

### Step 3: Configure
1. Open the `.env` file with Notepad
2. Find this line: `BACKEND_URL=http://localhost:3001`
3. Change it to your AWS URL: `BACKEND_URL=https://your-domain.com`
4. Save and close

### Step 4: Start
1. Double-click `start-printer-client.bat`
2. You should see: "✅ Connected to Backend Server"
3. Keep the window open!

### Step 5: Test
From your DMS web app, try printing a label. It should print on this PC!

---

## ⚙️ CONFIGURATION FILE (.env)

Open `.env` in Notepad and edit:

```
# YOUR AWS BACKEND URL (REQUIRED!)
BACKEND_URL=https://your-company-dms.com

# Security token (ask your admin if needed)
PRINTER_TOKEN=

# Printer name filter
PRINTER_FILTER=Brother

# Debug mode
DEBUG=false
```

**SAVE THE FILE** after editing!

---

## ✅ CHECKLIST FOR EACH PC

Before leaving the PC, verify:

□ Printer is ON and connected via USB  
□ Test page prints from Windows (Settings → Printers)  
□ `install.bat` completed successfully  
□ `.env` file has correct BACKEND_URL  
□ `start-printer-client.bat` is running  
□ Window shows "✅ Connected to Backend Server"  
□ Test print works from web app  

---

## ⚠️ TROUBLESHOOTING

### "Node.js is not installed"
→ Download from https://nodejs.org and install

### "No Brother printer found"  
→ Check USB cable  
→ Check printer is ON  
→ Check driver is installed  
→ Run PowerShell: `Get-Printer` to see printer name  

### "Cannot connect to backend"
→ Check internet connection  
→ Verify BACKEND_URL in .env is correct  
→ Try opening the URL in a web browser  

### "Nothing prints"
→ Check printer has labels/tape loaded  
→ Try printing from Windows directly  
→ Check printer is not showing error LED  
→ Restart printer and try again  

---

## 🔄 DAILY USE

### To Start Printing
1. Double-click `start-printer-client.bat`
2. Keep window open
3. Minimize window if you want

### To Stop Printing
1. Go to the printer client window
2. Press **Ctrl+C**
3. Or just close the window

### If Connection Lost
The client will automatically reconnect!  
Just keep the window open.

---

## 📞 NEED HELP?

Contact your DMS administrator with:
- Screenshot of any error messages
- Your printer model name
- Your PC name/location

---

## 🔒 SECURITY NOTES

- Do NOT share your `.env` file  
- Do NOT modify other files  
- Only run batch files from trusted sources  
- Keep the printer client updated  

---

## 📁 FILE STRUCTURE

```
printer/
├── install.bat              ← Run ONCE per PC
├── start-printer-client.bat ← Run to start service
├── .env                     ← Your configuration (EDIT THIS!)
├── .env.example             ← Template
├── config.js                ← Loads configuration
├── README.md                ← Full documentation
├── package.json             ← Dependencies list
└── src/
    └── index.js             ← Main program (don't edit)
```

---

## 💡 TIPS

✅ **Auto-start**: Create shortcut to `start-printer-client.bat` in Startup folder  
✅ **Multiple printers**: Run one client per printer on same PC (different folders)  
✅ **Remote access**: Can run via TeamViewer/Remote Desktop  
✅ **Logs**: Enable DEBUG=true in .env for troubleshooting  

---

**Version:** 1.0  
**Last Updated:** February 2026  
**Support:** Contact DMS Administrator
