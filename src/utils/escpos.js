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

    // Return Uint8Array for writing to Bluetooth characteristic
    getData() {
        return new Uint8Array(this.buffer);
    }
}
