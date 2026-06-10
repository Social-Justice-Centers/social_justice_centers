package Initialization

import (
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"log"
	"math/big"
	"net/smtp"
	"os"
	"sync"
	"time"

	"my-backend/utils"

	"golang.org/x/crypto/bcrypt"
)

type otpEntry struct {
	hash   string // bcrypt hash of raw OTP
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

func storeOTP(phone, code string) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(code), 10)
	if err != nil {
		log.Printf("ERROR: bcrypt hash failed: %v\n", err)
		return
	}
	otpMu.Lock()
	defer otpMu.Unlock()
	otpStore[phone] = otpEntry{hash: string(hashed), expiry: utils.Now().Add(time.Minute)}
}

func verifyAndConsumeOTP(phone, code string) bool {
	otpMu.Lock()
	defer otpMu.Unlock()
	entry, ok := otpStore[phone]
	if !ok {
		return false
	}
	if utils.Now().After(entry.expiry) {
		delete(otpStore, phone)
		return false
	}
	err := bcrypt.CompareHashAndPassword([]byte(entry.hash), []byte(code))
	if err != nil {
		return false
	}
	delete(otpStore, phone)
	return true
}

func sendOTPEmail(toEmail, otp string) error {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		host = "smtp.gmail.com"
	}
	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "587"
	}
	user := os.Getenv("SMTP_USER")
	if user == "" {
		user = "sjcenter@gmail.com"
	}
	pass := os.Getenv("SMTP_PASS")

	if pass == "" {
		log.Printf("[DEV WARN] SMTP_PASS not set! OTP for <%s>: %s\n", toEmail, otp)
		return nil
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

func SendReminderEmail(toEmail string) error {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		host = "smtp.gmail.com"
	}
	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "587"
	}
	user := os.Getenv("SMTP_USER")
	if user == "" {
		user = "sjcenter@gmail.com"
	}
	pass := os.Getenv("SMTP_PASS")

	if pass == "" {
		log.Printf("[DEV WARN] SMTP_PASS not set! Reminder for <%s>\n", toEmail)
		return nil
	}

	subject := "=?UTF-8?B?" + base64.StdEncoding.EncodeToString([]byte("תזכורת: לא דיווחת יציאה ממשמרת")) + "?="
	body := "שמנו לב שחלפה חצי שעה מסיום המשמרת המתוכננת שלך, ועדיין לא דיווחת יציאה.\r\nאנא היכנס למערכת ודווח יציאה בהקדם.\r\n\r\nתודה,\r\nצוות מרכזי הצדק."
	msg := []byte(
		"To: " + toEmail + "\r\n" +
			"From: " + user + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"Content-Type: text/plain; charset=UTF-8\r\n" +
			"\r\n" +
			body,
	)

	auth := smtp.PlainAuth("", user, pass, host)

	if port == "465" {
		return sendViaTLS(host, port, auth, user, toEmail, msg)
	}
	return smtp.SendMail(host+":"+port, auth, user, []string{toEmail}, msg)
}
