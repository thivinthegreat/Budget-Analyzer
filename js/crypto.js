/* ──────────────────────────────────────────────
   CryptoManager — AES-256-GCM with PBKDF2 key derivation
   Uses Web Crypto API (no external dependencies)
   ────────────────────────────────────────────── */
const CryptoManager = (() => {
    const SALT_LEN = 16;
    const IV_LEN = 12;
    const ITERATIONS = 100000;
    const VERIFY_PLAINTEXT = 'spendlens-auth-ok-v1';

    /* ── Key derivation ────────────────────── */
    async function deriveKey(passphrase, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /* ── Encrypt ───────────────────────────── */
    async function encrypt(plaintext, passphrase) {
        const enc = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
        const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
        const key = await deriveKey(passphrase, salt);

        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(plaintext)
        );

        // Pack: salt + iv + ciphertext (includes GCM tag)
        const result = new Uint8Array(SALT_LEN + IV_LEN + ciphertext.byteLength);
        result.set(salt, 0);
        result.set(iv, SALT_LEN);
        result.set(new Uint8Array(ciphertext), SALT_LEN + IV_LEN);
        return result;
    }

    /* ── Decrypt ───────────────────────────── */
    async function decrypt(encryptedBytes, passphrase) {
        const data = new Uint8Array(encryptedBytes);
        const salt = data.slice(0, SALT_LEN);
        const iv = data.slice(SALT_LEN, SALT_LEN + IV_LEN);
        const ciphertext = data.slice(SALT_LEN + IV_LEN);

        const key = await deriveKey(passphrase, salt);

        const plainBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        return new TextDecoder().decode(plainBuffer);
    }

    /* ── Verify passphrase against verify.enc ── */
    async function verify(encryptedBytes, passphrase) {
        try {
            const result = await decrypt(encryptedBytes, passphrase);
            return result === VERIFY_PLAINTEXT;
        } catch (_) {
            return false;
        }
    }

    /* ── Helper: download a Uint8Array as file ── */
    function downloadFile(data, filename) {
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /* ── Public getters ───────────────────── */
    function getVerifyPlaintext() { return VERIFY_PLAINTEXT; }

    return { encrypt, decrypt, verify, downloadFile, getVerifyPlaintext };
})();
