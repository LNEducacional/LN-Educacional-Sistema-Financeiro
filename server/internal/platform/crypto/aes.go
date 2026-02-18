package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
)

var (
	ErrInvalidCiphertext = errors.New("ciphertext too short")
	ErrDecryptionFailed  = errors.New("decryption failed")
)

// DeriveKey deriva uma chave de 32 bytes (256 bits) a partir de uma string
// usando SHA-256. Isso garante que qualquer string possa ser usada como chave.
func DeriveKey(secret string) []byte {
	hash := sha256.Sum256([]byte(secret))
	return hash[:]
}

// Encrypt criptografa um texto usando AES-256-GCM
// Retorna o ciphertext codificado em base64
func Encrypt(plaintext string, key []byte) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Gerar nonce aleatorio
	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Criptografar (nonce e prepended ao ciphertext)
	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)

	// Retornar como base64
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt descriptografa um texto criptografado com AES-256-GCM
// Espera o ciphertext codificado em base64
func Decrypt(ciphertextB64 string, key []byte) (string, error) {
	if ciphertextB64 == "" {
		return "", nil
	}

	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", ErrInvalidCiphertext
	}

	// Extrair nonce e ciphertext
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	// Descriptografar
	plaintext, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", ErrDecryptionFailed
	}

	return string(plaintext), nil
}

// MaskSecret mascara uma string sensivel, mostrando apenas os ultimos 4 caracteres
// Ex: "sk_live_abc123xyz" -> "***xyz"
func MaskSecret(value string) string {
	if value == "" {
		return ""
	}
	if len(value) <= 4 {
		return "***"
	}
	return "***" + value[len(value)-4:]
}

// IsConfigured verifica se um valor secreto esta configurado (nao vazio)
func IsConfigured(value string) bool {
	return value != ""
}
