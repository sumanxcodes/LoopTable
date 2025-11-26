const crypto = require('crypto');

// AES-256-GCM encryption/decryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes hex string
const IV_LENGTH = 12; // standard GCM iv length

function encrypt(text) {
  if (!ENCRYPTION_KEY) {
    throw new Error('Missing ENCRYPTION_KEY in environment');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

function decrypt(encrypted) {
  if (!ENCRYPTION_KEY) {
    throw new Error('Missing ENCRYPTION_KEY in environment');
  }
  const iv = Buffer.from(encrypted.iv, 'hex');
  const authTag = Buffer.from(encrypted.authTag, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(Buffer.from(encrypted.content, 'hex'), null, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
