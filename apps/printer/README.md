# DMS Printer Client - USB Printer Support for Cloud Deployment

A standalone printer client that connects your USB-connected Brother label printer to your cloud-hosted DMS backend on AWS.

## Overview

This printer client allows you to run your DMS application on AWS while using USB-connected printers on local PCs. Each PC with a printer runs this lightweight client, which connects to your cloud backend and handles print jobs locally.

### How It Works

1. **Cloud Backend** (AWS) - Your main DMS application runs in the cloud
2. **Printer Client** (Local PCs) - This application runs on each PC with a USB printer
3. **Real-time Communication** - Socket.IO maintains a persistent connection between cloud and local clients
4. **Print Jobs** - When someone prints from the web app, the job is sent to the appropriate printer client

## Supported Printers

- **Brother PT-P710BT** (Primary support)
- **Brother P-touch series** (PT-P series label printers)
- Other Brother label printers connected via USB

## Features

- ✅ Cloud-ready architecture (connects to remote backend)
- ✅ USB printer support (no WiFi needed on printer)
- ✅ QR code generation and printing
- ✅ Barcode generation (CODE128)  
- ✅ Automatic printer detection
- ✅ Real-time print job processing
- ✅ Error handling and retry logic
- ✅ Minimal dependencies for easy deployment

---

## 📦 Installation on Each PC

### Prerequisites

1. **Node.js** installed (Download from https://nodejs.org/)
   - LTS version recommended
   - Includes npm automatically

2. **Brother Printer** connected via USB
   - Printer driver installed
   - Printer powered on
   - Test print from Windows to verify driver works

### Step 1: Get the Printer Client Files

Copy the entire `apps/printer` folder to each PC that has a printer. You can:
- Use a USB drive
- Share via network
- Download from a shared location
- Email as a ZIP file

Place the folder anywhere on the PC (e.g., `C:\DMS-Printer\` or Desktop)

### Step 2: Run Installation

1. Navigate to the printer folder
2. Double-click `install.bat`
3. Wait for dependencies to install (takes 2-5 minutes)
4. Installation will create a `.env` configuration file

### Step 3: Configure for Cloud

1. Open the `.env` file in Notepad
2. Change `BACKEND_URL` from `http://localhost:3001` to your AWS backend URL
   ```
   BACKEND_URL=https://your-app-domain.com
   ```
3. (Optional) Set `PRINTER_TOKEN` if your backend requires authentication
4. Save and close the file

**Example `.env` file:**
```env
# Cloud Backend URL
BACKEND_URL=https://api.mydms.com

# Authentication token (optional)
PRINTER_TOKEN=your-secure-token-here

# Printer detection
PRINTER_FILTER=Brother

# Debug logs
DEBUG=false
```

---

## 🚀 Running the Printer Client

### Start the Service

Double-click `start-printer-client.bat`

You should see:
```
========================================
  DMS PRINTER CLIENT
========================================

Starting printer client service...

📋 Available USB/System Printers:
  1. Brother PT-P710BT ⭐ Brother printer detected!
  
✅ Detected Brother Printer: "Brother PT-P710BT"
✅ Connected to Socket Server: abc123xyz
📡 Printer service registered and ready to print
```

### Keep It Running

- ✅ Leave the window open while users need to print
- ✅ The service will automatically reconnect if connection drops
- ⚠️ Do NOT close the window - this stops the print service
- ⚠️ Press Ctrl+C to stop the service when needed

---

## 🔧 Configuration Options

### .env File Settings

| Setting | Description | Example |
|---------|-------------|---------|
| `BACKEND_URL` | Your AWS backend URL (REQUIRED) | `https://api.mydms.com` |
| `PRINTER_TOKEN` | Authentication token for security | `abc-123-def-456` |
| `PRINTER_FILTER` | Text to match your printer name | `Brother` or `PT-P710BT` |
| `DEBUG` | Enable detailed logging | `true` or `false` |

---

## 🖨️ Printer Setup

### Verify Printer Connection

1. Open **Settings** → **Devices** → **Printers & scanners**
2. Verify your Brother printer is listed
3. Click on it and select "Print test page"
4. If test page works, the printer client will work too

### Common Printer Names

The client auto-detects printers containing these names:
- `Brother PT-P710BT`
- `Brother PT-P`
- `Brother P-touch`
- Any printer with "Brother" in the name

### If Printer Not Detected

1. Check USB cable is connected
2. Check printer is powered on
3. Check printer driver is installed
4. Run PowerShell and type: `Get-Printer`
5. Find your printer name in the list
6. Update `PRINTER_FILTER` in `.env` to match that name

---

## 🌐 Network Configuration

### Firewall Requirements

The printer client needs to connect to your AWS backend on port 3001 (or your configured port).

**Allow outbound connections to:**
- Your AWS backend domain
- Port: 3001 (or your configured Socket.IO port)
- Protocol: WebSocket (wss://) or HTTP (http://)

### Corporate Networks

If behind a corporate firewall:
1. Ask IT to whitelist your AWS backend domain
2. Ensure WebSocket connections are allowed
3. Test connection: `ping your-backend-domain.com`

---

## 📋 Troubleshooting

### Problem: "Cannot connect to backend"

**Symptoms:** Client shows connection errors or disconnects immediately

**Solutions:**
1. Verify `BACKEND_URL` in `.env` is correct
2. Check if backend is running and accessible
3. Test in browser: Open `https://your-backend-url.com`
4. Check firewall isn't blocking outbound connections
5. Ensure backend allows connections from client IPs

### Problem: "No Brother printer found"

**Symptoms:** Warning message about printer not detected

**Solutions:**
1. Check USB cable is connected firmly
2. Verify printer is powered on
3. Ensure printer driver is installed:
   - Open Control Panel → Printers
   - Look for your Brother printer
   - If missing, download driver from Brother website
4. Run PowerShell: `Get-Printer` to see all printers
5. Update `PRINTER_FILTER` in `.env` to match exact printer name

### Problem: "Print job received but nothing prints"

**Symptoms:** Client receives job but no label comes out

**Solutions:**
1. Check printer has labels/tape loaded
2. Verify printer is not in error state (check LED lights)
3. Try printing a test page from Windows
4. Check the temporary PDF file in the printer folder (for debugging)
5. Restart the printer and try again

### Problem: "Dependencies failed to install"

**Symptoms:** `install.bat` shows errors during npm install

**Solutions:**
1. Check internet connection
2. Run Command Prompt as Administrator
3. Manually run: `npm install`
4. If still fails, try: `npm install --force`
5. Check if antivirus is blocking npm

### Problem: Multiple prints for one job

**Symptoms:** Same label prints 2-3 times

**Solutions:**
1. This is prevented by duplicate detection in the code
2. If still happening, check if multiple printer clients are running
3. Make sure only ONE instance of `start-printer-client.bat` is running per printer

### Problem: "Node.js is not installed"

**Solutions:**
1. Download Node.js from: https://nodejs.org/
2. Install LTS version (recommended)
3. Restart Command Prompt after installation
4. Verify with: `node --version`

---

## 🔒 Security Considerations

### Production Deployment

1. **Use HTTPS** - Set `BACKEND_URL` to `https://` not `http://`
2. **Set PRINTER_TOKEN** - Add authentication token in `.env`
3. **Restrict Backend** - Configure backend to only accept connections from known printer clients
4. **Network Security** - Run printer clients on secure network
5. **Update Regularly** - Keep Node.js and dependencies updated

### Token Authentication

If your backend requires authentication, ensure:
- `PRINTER_TOKEN` in printer client `.env` matches server
- Backend validates token on connection
- Tokens are kept secret and not shared

---

## 📝 Advanced Usage

### Running as Windows Service

To run the printer client as a Windows service (starts automatically on boot):

1. Install `node-windows`:
   ```
   npm install -g node-windows
   ```

2. Create a service installer script (save as `install-service.js`):
   ```javascript
   var Service = require('node-windows').Service;
   
   var svc = new Service({
     name:'DMS Printer Client',
     description: 'DMS printer client for USB label printing',
     script: require('path').join(__dirname,'src','index.js')
   });
   
   svc.on('install',function(){
     svc.start();
   });
   
   svc.install();
   ```

3. Run: `node install-service.js`

### Custom Printer Filter

If you have multiple printers, customize detection:

```env
# Match specific model
PRINTER_FILTER=PT-P710BT

# Match any Brother P-touch
PRINTER_FILTER=P-touch

# Match exact name
PRINTER_FILTER=Brother PT-P710BT Bluetooth
```

### Debug Mode

Enable detailed logging:

```env
DEBUG=true
```

This shows:
- Full Socket.IO connection logs
- PDF generation details
- Print command details
- Error stack traces

---

## 📞 Support & Maintenance

### Regular Maintenance

1. **Check for Updates** - Update dependencies periodically
   ```
   npm update
   ```

2. **Monitor Logs** - Watch printer client window for errors

3. **Test Prints** - Periodically test to ensure system works

4. **Backup Configuration** - Keep a copy of your `.env` file

### Getting Help

If issues persist:
1. Enable `DEBUG=true` in `.env`
2. Reproduce the issue
3. Copy the error messages from the client window
4. Contact your DMS administrator with:
   - Error messages
   - Printer model
   - Node.js version (`node --version`)
   - Windows version

---

## 📜 License & Credits

Part of the DMS (Document Management System) project.

**Dependencies:**
- `socket.io-client` - Real-time communication
- `pdfkit` - PDF generation
- `qrcode` - QR code generation  
- `bwip-js` - Barcode generation
- `pdf-to-printer` - Windows printing

---

## 🎯 Quick Start Checklist

For each PC with a printer:

- [ ] Node.js installed
- [ ] Printer connected via USB
- [ ] Printer driver installed
- [ ] Printer folder copied to PC
- [ ] Ran `install.bat`
- [ ] Edited `.env` with AWS backend URL
- [ ] Ran `start-printer-client.bat`
- [ ] Saw "Connected to Socket Server" message
- [ ] Tested a print from web app

✅ Done! Your printer is now connected to the cloud.

---

**Questions?** Contact your system administrator or refer to the DMS documentation.
