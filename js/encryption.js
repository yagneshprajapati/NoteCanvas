// Encryption Manager - Handles data encryption and decryption
class EncryptionManager {
  constructor() {
    this.algorithm = "AES";
    this.mode = CryptoJS.mode.CBC; // Changed from GCM to CBC for better compatibility
    this.keySize = 256;
  }

  // Generate a key from password using PBKDF2
  generateKey(password, salt) {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: this.keySize / 32,
      iterations: 10000,
    });
  }

  // Encrypt data with password
  encrypt(data, password) {
    try {
      const salt = CryptoJS.lib.WordArray.random(128 / 8);
      const key = this.generateKey(password, salt);
      const iv = CryptoJS.lib.WordArray.random(128 / 8); // Changed to 128 bits for CBC

      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        iv: iv,
        mode: CryptoJS.mode.CBC, // Use CBC mode
        padding: CryptoJS.pad.Pkcs7,
      });

      // Combine salt, iv, and encrypted data
      const result = {
        salt: salt.toString(),
        iv: iv.toString(),
        encrypted: encrypted.toString(),
        timestamp: Date.now(),
      };

      return JSON.stringify(result);
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  // Decrypt data with password
  decrypt(encryptedData, password) {
    try {
      const data = JSON.parse(encryptedData);
      const salt = CryptoJS.enc.Hex.parse(data.salt);
      const iv = CryptoJS.enc.Hex.parse(data.iv);
      const key = this.generateKey(password, salt);

      const decrypted = CryptoJS.AES.decrypt(data.encrypted, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC, // Use CBC mode
        padding: CryptoJS.pad.Pkcs7,
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error("Invalid password or corrupted data");
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data. Please check your password.");
    }
  }

  // Validate password strength
  validatePassword(password) {
    if (password.length < 6) {
      return {
        valid: false,
        message: "Password must be at least 6 characters long",
      };
    }
    return { valid: true, message: "Password is valid" };
  }

  // Generate a random password
  generateRandomPassword(length = 12) {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

// Export for use in other modules
window.EncryptionManager = EncryptionManager;
