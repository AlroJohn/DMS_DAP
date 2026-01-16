const io = require('socket.io-client');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');

// Replace 'config.socket' with your Socket.IO URL
//const socketUrl = 'https://quanbylab.com:3002';
const socketUrl = process.env.PRINTER_SOCKET_URL || 'https://quanby-staging.com'; // Socket.IO typically uses HTTP(S) protocol
const socket = io(socketUrl, {
    transports: ['websocket'],
    rejectUnauthorized: false
});

socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
});

socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
});

// Listen for print job events
socket.on('printJob', async (data) => {
    handlePrintJob(data);
});

// Also listen on the default message event for compatibility
socket.on('message', async (data) => {
    handlePrintJob(data);
});

// Main function to handle print jobs
async function handlePrintJob(receivedData) {
    // Decode the incoming message if it's a buffer
    let socketData;
    if (Buffer.isBuffer(receivedData)) {
        const decodedMessage = Buffer.from(receivedData).toString('utf-8');
        socketData = JSON.parse(decodedMessage);
    } else {
        socketData = receivedData;
    }

    // Check the application identifier - accept both 'pcso' and 'dms' apps
    if (socketData.app !== 'pcso' && socketData.app !== 'dms') return;

    if (socketData.data.event != 'printing') {
        return;
    }

    const {
        number, name, gender, id, location, date, time, services, printer_ip,
        type, title, imageUrl, timestamp
    } = socketData.data;

    const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON, // 'star' or 'epson'
        interface: `tcp://${printer_ip || process.env.DEFAULT_PRINTER_IP || '192.168.1.100'}`,
        options: {
            timeout: 1000,
        },
        width: 48, // Number of characters in one line - default: 48
        characterSet: CharacterSet.SLOVENIA, // Character set - default: SLOVENIA
        breakLine: BreakLine.NONE, // Break line after WORD or CHARACTERS. Disabled with NONE - default: WORD
        removeSpecialCharacters: false, // Removes special characters - default: false
        lineCharacter: '-', // Use custom character for drawing lines - default: -
    });

    const isConnected = await printer.isPrinterConnected();
    console.log('Printer connected:', isConnected);
    if (!isConnected) {
        console.log('Printer not found');
        // Emit error event back to server
        socket.emit('printError', {
            jobId: socketData.jobId || 'unknown',
            error: 'Printer not connected'
        });
        return;
    }

    try {
        // Handle different types of print jobs
        if (type === 'qr_code' || type === 'barcode') {
            // Handle QR code or barcode printing
            await handleImagePrint(printer, type, title, imageUrl, timestamp);
        } else {
            // Handle traditional queue ticket printing (original functionality)
            await handleQueueTicketPrint(printer, { number, name, gender, id, location, date, time, services });
        }

        // Execute the print job
        await printer.execute();
        console.log('Print success.');

        // Emit success event back to server if needed
        socket.emit('printSuccess', {
            jobId: socketData.jobId || 'unknown',
            status: 'completed',
            message: 'Print job completed successfully'
        });
    } catch (error) {
        console.error('Print error:', error);

        // Emit error event back to server if needed
        socket.emit('printError', {
            jobId: socketData.jobId || 'unknown',
            error: error.message
        });
    }
}

// Function to handle QR code or barcode printing
async function handleImagePrint(printer, type, title, imageUrl, timestamp) {
    printer.alignCenter();

    // Print title
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(title || 'QR/Barcode');
    printer.bold(false);

    // Add timestamp if available
    if (timestamp) {
        const dateStr = new Date(timestamp).toLocaleString();
        printer.println(`Printed: ${dateStr}`);
        printer.drawLine();
    }

    printer.alignCenter();

    if (imageUrl) {
        try {
            // For now, we'll print a placeholder since we don't have canvas support
            // In a production environment with canvas, we would decode the image and print it
            console.log('Image URL detected, printing placeholder...');

            // Print a representation of the QR code using ASCII characters
            // This is a simplified approach for thermal printers
            printer.alignCenter();
            printer.println('');
            printer.println('┌──────────────────────────────────────┐');
            printer.println('│  ██████████████████████████████████  │');
            printer.println('│  ██████████████████████████████████  │');
            printer.println('│  ████  ██  ████  ████  ██  ████  ████  │');
            printer.println('│  ████  ██  ████  ████  ██  ████  ████  │');
            printer.println('│  ██████████████████████████████████  │');
            printer.println('│  ██████████████████████████████████  │');
            printer.println('│  ████  ████  ██  ██  ████  ████  ████  │');
            printer.println('│  ████  ████  ██  ██  ████  ████  ████  │');
            printer.println('│  ██████████████████████████████████  │');
            printer.println('│  ██████████████████████████████████  │');
            printer.println('│                                      │');
            printer.println('│  ██████████████████████████████████  │');
            printer.println('│  ████  ██  ████  ████  ██  ████  ████  │');
            printer.println('│  ████  ██  ████  ████  ██  ████  ████  │');
            printer.println('│  ██████████████████████████████████  │');
            printer.println('│  ██████████████████████████████████  │');
            printer.println('└──────────────────────────────────────┘');
            printer.println('');

            // Print a note about the actual image
            printer.alignCenter();
            printer.println('(Actual QR/Barcode image)');
            printer.println('(would be printed here)');
        } catch (error) {
            console.error('Error processing image:', error);
            printer.println('[IMAGE PRINT ERROR]');
            // Print error message and continue
            printer.println('Could not print image. See server logs.');
        }
    }

    // Add a footer and align center
    printer.alignCenter();
    printer.println('Thank you!');
    printer.cut();
}

// Function to handle traditional queue ticket printing (original functionality)
async function handleQueueTicketPrint(printer, data) {
    const { number, name, gender, id, location, date, time, services } = data;

    printer.alignCenter();

    // Print P-100 with bigger text
    printer.bold(true);
    printer.setTextSize(3, 3); // Bigger text size
    printer.println(number);
    printer.setTextSize(0, 0); // Reset to normal text size
    printer.bold(false);
    // Print welcome message
    printer.drawLine();
    printer.println("Welcome! You're currently in the queue.");
    printer.drawLine();
    // Print labels in bold
    printer.alignLeft();
    printer.bold(true);
    printer.print("Name: ");
    printer.bold(false);
    printer.print(name)
    printer.newLine();

    printer.bold(true);
    printer.print("Gender: ");
    printer.bold(false);
    printer.print(gender)
    printer.newLine();

    if (id) {
        printer.bold(true);
        printer.print("ID: ");
        printer.bold(false);
        printer.print(id ?? 'No ID Specified')
        printer.newLine();
    }

    if (location) {
        printer.bold(true);
        printer.print("Location: ");
        printer.bold(false);
        printer.print(location ?? 'Not Specified.')
        printer.newLine();
    }


    printer.bold(true);
    printer.print("Date: ");
    printer.bold(false);
    printer.print(date)
    printer.newLine();

    printer.bold(true);
    printer.print("Time: ");
    printer.bold(false);
    printer.print(time)
    printer.newLine();

    printer.bold(true);
    printer.println("Services:");
    printer.bold(false);
    for (let service of services) {
        printer.println(`• ${service}`);
    }

    printer.newLine();

    // Print final message centered
    printer.alignCenter();
    printer.println("Your number will be called shortly.");

    printer.cut();
}

console.log("Printer server is running...");
