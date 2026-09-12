import crypto from 'node:crypto';

// Base32 alphabet for RFC 3548 / RFC 4648
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(base32) {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateHOTP(secretBuffer, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

export const twoFactorService = {
  /**
   * Genera un secreto TOTP en Base32 y el enlace otpauth
   */
  generateSecret({ email, issuer = 'Recargas Juegos Online' }) {
    const randomBytes = crypto.randomBytes(20);
    const secret = base32Encode(randomBytes);
    const label = encodeURIComponent(`${issuer}:${email}`);
    const encodedIssuer = encodeURIComponent(issuer);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

    // Generamos un QR SVG dinámico o URL de Google Charts segura para renderizar al instante
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(otpauthUrl)}`;

    return {
      secret,
      otpauthUrl,
      qrCodeUrl,
    };
  },

  /**
   * Valida un código TOTP de 6 dígitos considerando ventana de tiempo +/- 2 intervalos (+/- 60s)
   */
  verifyToken(secret, token, window = 2) {
    if (!secret || !token) return false;
    const cleanToken = String(token).trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanToken)) return false;

    try {
      const secretBuffer = base32Decode(secret);
      const currentTime = Math.floor(Date.now() / 1000);
      const currentCounter = Math.floor(currentTime / 30);

      for (let i = -window; i <= window; i++) {
        const generated = generateHOTP(secretBuffer, currentCounter + i);
        if (generated === cleanToken) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },
};

