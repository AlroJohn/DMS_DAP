# DMS Printer Client - Deployment Checklist

## For System Administrators

Use this checklist when deploying the printer client to multiple PCs.

---

## 📦 PRE-DEPLOYMENT PREPARATION

### 1. Backend Configuration
- [ ] Backend is deployed to AWS
- [ ] Backend URL is accessible (test in browser)
- [ ] Socket.IO port is open (default: 3001)
- [ ] Firewall rules allow WebSocket connections
- [ ] SSL certificate is configured (if using HTTPS)
- [ ] PRINTER_SOCKET_TOKEN is set in backend .env (if using authentication)

### 2. Create Distribution Package
- [ ] Run `create-package.bat` in printer folder
- [ ] Verify ZIP file is created
- [ ] Test extraction on a test PC
- [ ] Prepare QUICK_SETUP_GUIDE.md for users

### 3. Documentation
- [ ] Update BACKEND_URL in .env.example with actual AWS URL
- [ ] Document PRINTER_TOKEN if using authentication
- [ ] Create list of all PC locations that need printers
- [ ] Prepare printer driver installer (from Brother website)

---

## 🖥️ PER-PC DEPLOYMENT

For each PC with a printer:

### Hardware Setup
- [ ] Brother printer is unboxed and powered on
- [ ] USB cable connects printer to PC
- [ ] Printer has labels/tape loaded
- [ ] PC has available USB port

### Software Prerequisites
- [ ] Windows 10/11 (or compatible Windows version)
- [ ] Node.js LTS installed (https://nodejs.org)
  - [ ] Verify: Open CMD and type `node --version`
- [ ] Brother printer driver installed
  - [ ] Download from Brother support site
  - [ ] Or use driver CD
  - [ ] Test print from Windows (Settings → Printers → Print Test Page)

### Printer Client Installation
- [ ] Copy printer folder to PC (or extract ZIP)
- [ ] Location: Desktop, C:\DMS-Printer, or user preference
- [ ] Run `install.bat`
  - [ ] Wait for npm install to complete (2-5 minutes)
  - [ ] Verify "INSTALLATION COMPLETE" message
- [ ] Edit `.env` file
  - [ ] Set BACKEND_URL to AWS URL
  - [ ] Set PRINTER_TOKEN if required
  - [ ] Save file

### Testing
- [ ] Run `start-printer-client.bat`
- [ ] Verify connection messages:
  - [ ] "✅ Connected to Backend Server"
  - [ ] "📡 Printer service registered"
  - [ ] Printer name detected in logs
- [ ] Test print from web application
  - [ ] Log into DMS web app
  - [ ] Generate document
  - [ ] Click Print Label/QR Code
  - [ ] Verify label prints on local printer
- [ ] Test reconnection:
  - [ ] Stop printer client (Ctrl+C)
  - [ ] Start again
  - [ ] Verify reconnection

### Production Setup
- [ ] Create shortcut to `start-printer-client.bat` on Desktop
- [ ] Optional: Add to Windows Startup folder for auto-start
- [ ] Document PC name/location on tracking sheet
- [ ] Take photo of setup for documentation
- [ ] Label printer with PC name or location

---

## 📊 DEPLOYMENT TRACKING

Create a spreadsheet with these columns:

| PC Name | Location | Printer Model | IP Address | Status | Tested | Notes |
|---------|----------|---------------|------------|--------|--------|-------|
| PC-001  | Office-A | PT-P710BT     | 192.168.1.10 | ✅ Active | ✅ Yes | |
| PC-002  | Office-B | PT-P710BT     | 192.168.1.11 | ✅ Active | ✅ Yes | |
| PC-003  | Warehouse| PT-P710BT     | 192.168.1.12 | 🔄 Setup | ⏳ Pending | Driver issue |

---

## 🔧 POST-DEPLOYMENT

### User Training
- [ ] Show users how to start printer client
- [ ] Explain to keep window open
- [ ] Demonstrate test print from web app
- [ ] Provide QUICK_SETUP_GUIDE.md
- [ ] Share support contact information

### Monitoring
- [ ] Set up backend monitoring for connected printers
- [ ] Create alert for printer disconnections
- [ ] Schedule weekly checks of all printer clients
- [ ] Document common issues and solutions

### Maintenance Plan
- [ ] Schedule monthly Node.js/dependency updates
- [ ] Keep Brother printer drivers updated
- [ ] Monitor disk space (PDF temp files)
- [ ] Review logs for errors

---

## 🚨 TROUBLESHOOTING GUIDE

### Connection Issues

**Symptoms:** Client cannot connect to backend

**Checks:**
1. Ping AWS backend URL from PC
2. Test URL in browser
3. Check firewall (Windows Firewall, corporate firewall)
4. Verify backend is running
5. Check Socket.IO port is accessible
6. Review backend logs for connection attempts

**Solutions:**
- Update .env with correct URL
- Add firewall exception for Node.js
- Contact network admin to whitelist backend domain
- Verify SSL certificate (if using HTTPS)

### Printer Detection Issues

**Symptoms:** "No Brother printer found"

**Checks:**
1. Run PowerShell: `Get-Printer`
2. Check Device Manager → Printers
3. Try printing test page from Windows
4. Check USB cable connection
5. Check printer power

**Solutions:**
- Install/reinstall printer driver
- Update PRINTER_FILTER in .env to match exact name
- Try different USB port
- Restart printer and PC
- Use Brother's diagnostic tools

### Print Job Failures

**Symptoms:** Job received but nothing prints

**Checks:**
1. Check printer has labels loaded
2. Check printer error LEDs
3. Look at temp PDF files (for debugging)
4. Check Windows print queue
5. Review printer client logs

**Solutions:**
- Clear Windows print queue
- Restart printer
- Restart printer client
- Check label size settings
- Verify PDF generation (check temp files)

---

## 📋 ROLLBACK PLAN

If deployment fails:

1. **Stop printer client** on affected PC
2. **Document the issue** with screenshots/logs
3. **Test with DEBUG=true** for detailed logs
4. **Contact support** with error details
5. **Fallback**: Use manual label printing temporarily

---

## 🔐 SECURITY CHECKLIST

- [ ] HTTPS enabled on backend (not HTTP)
- [ ] PRINTER_TOKEN configured and unique
- [ ] .env files not shared publicly
- [ ] Only authorized users have printer folder access
- [ ] Windows user accounts have standard privileges (not admin)
- [ ] Printer clients connect from known IPs only (if possible)
- [ ] Regular updates scheduled for security patches

---

## 📞 SUPPORT CONTACTS

**DMS Administrator:** ___________________________

**Phone:** ___________________________

**Email:** ___________________________

**IT Helpdesk:** ___________________________

**Brother Support:** https://www.brother.com/support

**Node.js Issues:** https://nodejs.org/en/docs/

---

## 📝 DEPLOYMENT NOTES

### AWS Backend URL:
```
BACKEND_URL=https://____________________________
```

### Printer Token (if used):
```
PRINTER_TOKEN=____________________________
```

### Deployment Date: ___________________________

### Deployed By: ___________________________

### Total PCs Deployed: ___________________________

### Issues Encountered:
```
_______________________________________________
_______________________________________________
_______________________________________________
```

### Lessons Learned:
```
_______________________________________________
_______________________________________________
_______________________________________________
```

---

**Document Version:** 1.0  
**Last Updated:** February 2026  
**Next Review:** ___________________________
