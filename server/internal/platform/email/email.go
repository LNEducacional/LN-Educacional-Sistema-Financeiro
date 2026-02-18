package email

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
)

// Config holds SMTP configuration
type Config struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
	FromName string
}

// Service handles email sending via SMTP
type Service struct {
	config *Config
}

// NewService creates a new email service
func NewService(config *Config) *Service {
	return &Service{config: config}
}

// IsConfigured returns true if SMTP is properly configured
func (s *Service) IsConfigured() bool {
	return s.config != nil &&
		s.config.Host != "" &&
		s.config.Port != "" &&
		s.config.Username != "" &&
		s.config.Password != "" &&
		s.config.From != ""
}

// SendPasswordResetEmail sends a password reset email
func (s *Service) SendPasswordResetEmail(toEmail, toName, resetToken, baseURL string) error {
	if !s.IsConfigured() {
		return fmt.Errorf("email service not configured")
	}

	resetLink := fmt.Sprintf("%s/reset-password/%s", baseURL, resetToken)

	subject := "Redefinicao de Senha"
	body := s.buildPasswordResetEmailHTML(toName, resetLink)

	return s.sendEmail(toEmail, subject, body)
}

// buildPasswordResetEmailHTML builds the HTML email body
func (s *Service) buildPasswordResetEmailHTML(name, resetLink string) string {
	displayName := name
	if displayName == "" {
		displayName = "Usuario"
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinicao de Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #111827;">
    <table role="presentation" style="width: 100%%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px 40px; background: linear-gradient(135deg, #7c3aed 0%%, #a855f7 50%%, #d946ef 100%%); border-radius: 16px 16px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                Redefinicao de Senha
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px; background-color: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.1); border-top: none;">
                            <p style="margin: 0 0 20px; color: #e5e7eb; font-size: 16px; line-height: 1.6;">
                                Ola, <strong style="color: #ffffff;">%s</strong>
                            </p>

                            <p style="margin: 0 0 20px; color: #9ca3af; font-size: 15px; line-height: 1.6;">
                                Recebemos uma solicitacao para redefinir a senha da sua conta. Se voce nao fez essa solicitacao, ignore este email.
                            </p>

                            <p style="margin: 0 0 30px; color: #9ca3af; font-size: 15px; line-height: 1.6;">
                                Para redefinir sua senha, clique no botao abaixo:
                            </p>

                            <!-- Button -->
                            <table role="presentation" style="width: 100%%; border-collapse: collapse;">
                                <tr>
                                    <td align="center">
                                        <a href="%s" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%%, #a855f7 50%%, #d946ef 100%%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 12px;">
                                            Redefinir Senha
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                                Este link expira em <strong style="color: #9ca3af;">15 minutos</strong> por motivos de seguranca.
                            </p>

                            <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                                Se o botao nao funcionar, copie e cole o link abaixo no seu navegador:
                            </p>

                            <p style="margin: 10px 0 0; word-break: break-all;">
                                <a href="%s" style="color: #a855f7; font-size: 12px; text-decoration: none;">%s</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-top: none; border-radius: 0 0 16px 16px;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                                Este email foi enviado automaticamente. Por favor, nao responda.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`, displayName, resetLink, resetLink, resetLink)
}

// sendEmail sends an email using SMTP with TLS
func (s *Service) sendEmail(to, subject, htmlBody string) error {
	addr := fmt.Sprintf("%s:%s", s.config.Host, s.config.Port)

	// Build email headers and body
	fromHeader := s.config.From
	if s.config.FromName != "" {
		fromHeader = fmt.Sprintf("%s <%s>", s.config.FromName, s.config.From)
	}

	headers := make(map[string]string)
	headers["From"] = fromHeader
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	var msg strings.Builder
	for k, v := range headers {
		msg.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)

	// TLS config
	tlsConfig := &tls.Config{
		ServerName: s.config.Host,
		MinVersion: tls.VersionTLS12,
	}

	// Connect to SMTP server
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to SMTP server: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, s.config.Host)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	// Authenticate
	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP authentication failed: %w", err)
	}

	// Set sender and recipient
	if err := client.Mail(s.config.From); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("failed to set recipient: %w", err)
	}

	// Send the email body
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}
	defer w.Close()

	if _, err := w.Write([]byte(msg.String())); err != nil {
		return fmt.Errorf("failed to write email body: %w", err)
	}

	return nil
}
