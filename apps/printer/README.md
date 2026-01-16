# DMS Thermal Printer Service

This service handles thermal printing for the Document Management System (DMS), allowing printing of QR codes, barcodes, and other documents using thermal printers.

## Features

- Socket.IO-based communication for print job submission
- Support for both QR codes and barcodes with proper alignment
- Thermal printer connectivity via TCP/IP
- Support for HPRT TP8808S and other compatible thermal printers
- Real-time status updates (success/error)

## Prerequisites

- Node.js 18+
- pnpm package manager
- Thermal printer connected to the network (HPRT TP8808S or compatible)
- Python (optional, only required if you want to print actual images instead of placeholders)

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. (Optional) If you want to print actual images instead of placeholders, install canvas:
```bash
# On Windows, you'll need Python installed for canvas compilation
pnpm install canvas
```
Then update the package.json to include canvas in dependencies.

2. Set up environment variables (optional):
Create a `.env` file in the root of the printer app with the following variables:
```
PRINTER_IP=192.168.1.100  # Your thermal printer's IP address
SOCKET_IO_URL=https://your-socket-io-url.com  # Socket.IO endpoint for print jobs
```

## Configuration

The printer service expects print jobs to be sent via Socket.IO with the following structure:

```javascript
{
  app: 'dms',           // Application identifier
  data: {
    event: 'printing',  // Event type
    type: 'qr_code',    // Type: 'qr_code' or 'barcode'
    title: 'Document',  // Title for the print job
    imageUrl: 'data:image/png;base64,...', // Base64 encoded image data
    timestamp: '2023-01-01T00:00:00Z', // Timestamp
    printer_ip: '192.168.1.100' // Printer IP address
  }
}
```

## Usage

1. Start the printer service:
```bash
pnpm dev:printer
```

Or run directly:
```bash
cd apps/printer && pnpm start
```

2. The service will listen for Socket.IO connections and print jobs.

## Events

The service listens for the following events:
- `printJob`: Receives print job data
- `message`: Alternative event for receiving print job data (for compatibility)

The service emits the following events:
- `printSuccess`: Emitted when a print job completes successfully
- `printError`: Emitted when a print job fails

## Supported Printers

This service is tested with:
- HPRT TP8808S (58/80mm paper width)

Other ESC/POS compatible thermal printers should also work with minimal adjustments.

## Troubleshooting

- Ensure the printer IP address is correct and accessible on the network
- Verify that the printer supports ESC/POS commands
- Check that the Socket.IO connection is established properly
- Make sure the printer paper width is set correctly in the configuration
- Confirm that the thermal printer has paper loaded

## Integration with Frontend

The frontend sends print jobs via Socket.IO when the "Print" button is clicked in the image modal component. The printer service receives these jobs and processes them for thermal printing.