# DMS Printer Service - Brother PT-P710BT Compatible

Thermal and label printer service for DMS application with support for Brother PT-P710BT label printer.

## Supported Printers

- **Brother PT-P710BT** - Bluetooth/Network label printer with barcode support
- EPSON thermal printers
- Other ESC/POS compatible printers

## Features

- Real-time print job processing via Socket.IO
- Barcode generation and printing (CODE128, CODE39, EAN13, etc.)
- QR code generation and printing
- Network and Bluetooth printer support
- Automatic printer connection detection

## Brother PT-P710BT Setup

### Network Setup

1. **Connect Brother PT-P710BT to your network:**
   - Download and install Brother iPrint&Label app
   - Connect the printer via Bluetooth to your mobile device
   - Configure Wi-Fi settings through the app
   - Note the assigned IP address

2. **Configure environment variables:**
   ```bash
   PRINTER_IP=192.168.1.xxx  # Your printer's IP address
   PRINTER_PORT=9100
   PRINTER_TYPE=PT-P710BT
   ```

## Installation

```bash
cd apps/printer
pnpm install
```

## Usage

### Start the printer service:

```bash
pnpm dev
```

### Print a Barcode

Send a print job via Socket.IO from your backend:

```javascript
socket.emit('printJob', {
  app: 'dms',
  jobId: 'unique-job-id',
  data: {
    event: 'printing',
    printer_type: 'PT-P710BT',
    printType: 'barcode',
    barcodeData: 'DMS-2024-001',
    barcodeFormat: 'CODE128',
    printer_ip: '192.168.1.16',
    printer_port: 9100
  }
});
```

## Barcode Formats Supported

- **CODE128** (default) - Variable length, alphanumeric
- **CODE39** - Alphanumeric with special characters
- **EAN13** - 13-digit product barcodes
- **UPC** - Universal Product Code

## Troubleshooting

1. Verify printer IP: `ping <printer-ip>`
2. Check port 9100: `Test-NetConnection -ComputerName <printer-ip> -Port 9100`
3. Ensure printer is on same network
4. Check firewall settings
