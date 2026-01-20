/**
 * Simple ESC/POS Command Builder
 * Used to format text for thermal printers via Bluetooth
 */

const ESC = '\x1B';
const GS = '\x1D';

export const EP_INIT = ESC + '@';
export const EP_ALIGN_LEFT = ESC + 'a' + '\x00';
export const EP_ALIGN_CENTER = ESC + 'a' + '\x01';
export const EP_ALIGN_RIGHT = ESC + 'a' + '\x02';
export const EP_BOLD_ON = ESC + 'E' + '\x01';
export const EP_BOLD_OFF = ESC + 'E' + '\x00';

export class ReceiptBuilder {
    constructor() {
        this.buffer = [];
        this.encoder = new TextEncoder(); // UTF-8
    }

    add(data) {
        if (typeof data === 'string') {
            const encoded = this.encoder.encode(data);
            encoded.forEach(b => this.buffer.push(b));
        } else if (Array.isArray(data)) {
            data.forEach(b => this.buffer.push(b));
        }
    }

    init() {
        this.add(EP_INIT);
        return this;
    }

    align(align) {
        if (align === 'center') this.add(EP_ALIGN_CENTER);
        else if (align === 'right') this.add(EP_ALIGN_RIGHT);
        else this.add(EP_ALIGN_LEFT);
        return this;
    }

    text(txt) {
        this.add(txt);
        return this;
    }

    textLn(txt) {
        this.add(txt + '\n');
        return this;
    }

    bold(enable) {
        this.add(enable ? EP_BOLD_ON : EP_BOLD_OFF);
        return this;
    }

    feed(n = 2) {
        this.add(ESC + 'd' + String.fromCharCode(n));
        return this;
    }

    cut() {
        this.add(GS + 'V' + '\x41' + '\x00');
        return this;
    }

    qr(content) {
        // High-level wrapper for GS ( k commands
        // 1. Model Selection (Model 2)
        this.add(GS + '(k' + '\x04\x00' + '\x31\x41\x32\x00');
        // 2. Module Size (Size 6 - decent size)
        this.add(GS + '(k' + '\x03\x00' + '\x31\x43\x06');
        // 3. Error Correction (Level M = 49)
        this.add(GS + '(k' + '\x03\x00' + '\x31\x45\x31');

        // 4. Store Data
        const storeLen = content.length + 3;
        const pL = String.fromCharCode(storeLen % 256);
        const pH = String.fromCharCode(Math.floor(storeLen / 256));
        this.add(GS + '(k' + pL + pH + '\x31\x50\x30' + content);

        // 5. Print Symbol
        this.add(GS + '(k' + '\x03\x00' + '\x31\x51\x30');

        return this;
    }

    // Return Uint8Array for writing to Bluetooth characteristic
    getData() {
        return new Uint8Array(this.buffer);
    }
}
