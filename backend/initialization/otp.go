package Initialization

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"net/smtp"
	"os"
	"sync"
	"time"
)

type otpEntry struct {
	hash   string // SHA-256 of the raw OTP — never stored in plaintext
	expiry time.Time
}

var (
	otpMu    sync.Mutex
	otpStore = make(map[string]otpEntry)
)

func generateOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func hashOTP(code string) string {
	h := sha256.Sum256([]byte(code))
	return hex.EncodeToString(h[:])
}

func storeOTP(phone, code string) {
	otpMu.Lock()
	defer otpMu.Unlock()
	otpStore[phone] = otpEntry{hash: hashOTP(code), expiry: time.Now().Add(time.Minute)}
}

func verifyAndConsumeOTP(phone, code string) bool {
	otpMu.Lock()
	defer otpMu.Unlock()
	entry, ok := otpStore[phone]
	if !ok {
		return false
	}
	if time.Now().After(entry.expiry) {
		delete(otpStore, phone)
		return false
	}
	if entry.hash != hashOTP(code) {
		return false
	}
	delete(otpStore, phone)
	return true
}

func sendOTPEmail(toEmail, otp string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	// Dev fallback: print OTP to server log when SMTP is not configured.
	if host == "" || user == "" || pass == "" {
		log.Printf("[DEV] OTP for <%s>: %s (configure SMTP_* env vars to send real emails)\n", toEmail, otp)
		return nil
	}
	if port == "" {
		port = "587"
	}

	subject := "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte("קוד כניסה למערכת")) + "?="
	body := fmt.Sprintf("קוד הכניסה שלך הוא: %s\r\nהקוד תקף לדקה אחת.", otp)
	msg := []byte(
		"To: " + toEmail + "\r\n" +
			"From: " + user + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n" +
			"\r\n" +
			body,
	)

	auth := smtp.PlainAuth("", user, pass, host)

	// Port 465 uses implicit TLS; port 587 uses STARTTLS (handled by smtp.SendMail).
	if port == "465" {
		return sendViaTLS(host, port, auth, user, toEmail, msg)
	}
	return smtp.SendMail(host+":"+port, auth, user, []string{toEmail}, msg)
}

// sendViaTLS dials an implicit-TLS connection (port 465) and sends the message.
func sendViaTLS(host, port string, auth smtp.Auth, from, to string, msg []byte) error {
	conn, err := tls.Dial("tcp", host+":"+port, &tls.Config{ServerName: host})
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer client.Close()

	if err = client.Auth(auth); err != nil {
		return err
	}
	if err = client.Mail(from); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err = w.Write(msg); err != nil {
		return err
	}
	if err = w.Close(); err != nil {
		return err
	}
	return client.Quit()
}
