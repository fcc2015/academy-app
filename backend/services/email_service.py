"""
Email service for sending notifications via SMTP.
Configure environment variables:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@academy.com")
ACADEMY_NAME = os.getenv("ACADEMY_NAME", "Football Academy")


def _send_email(to: str, subject: str, html_body: str):
    """Send an email via SMTP. Silently fails if SMTP is not configured."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL] SMTP not configured. Would send to {to}: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{ACADEMY_NAME} <{SMTP_FROM}>"
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to, msg.as_string())

        print(f"[EMAIL] Sent to {to}: {subject}")
        return True
    except Exception as e:
        print(f"[EMAIL] Failed to send to {to}: {e}")
        return False


def send_welcome_email(to: str, name: str):
    """Send welcome email to new user."""
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0;">⚽ Bienvenue!</h1>
        </div>
        <p style="font-size: 16px; color: #374151;">Bonjour <strong>{name}</strong>,</p>
        <p style="color: #6b7280;">Votre compte {ACADEMY_NAME} a été créé avec succès. Vous pouvez maintenant accéder à votre espace.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="#" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 14px;">Accéder à mon espace</a>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">{ACADEMY_NAME}</p>
    </div>
    """
    return _send_email(to, f"Bienvenue à {ACADEMY_NAME}!", html)


def send_payment_reminder(to: str, player_name: str, amount: float, due_date: str):
    """Send payment reminder email."""
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0;">💳 Rappel de paiement</h1>
        </div>
        <p style="font-size: 16px; color: #374151;">Bonjour,</p>
        <p style="color: #6b7280;">Un paiement est en attente pour <strong>{player_name}</strong>:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #64748b;">Montant</p>
            <p style="margin: 0; font-size: 28px; font-weight: 900; color: #0f172a;">{amount:.2f} MAD</p>
            <p style="margin: 12px 0 0; font-size: 13px; color: #94a3b8;">Échéance: {due_date}</p>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">{ACADEMY_NAME}</p>
    </div>
    """
    return _send_email(to, f"Rappel: Paiement en attente - {player_name}", html)


def send_event_notification(to: str, event_title: str, event_date: str, event_time: str = ""):
    """Send event notification email."""
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0;">📅 Nouvel événement</h1>
        </div>
        <p style="font-size: 16px; color: #374151;">Bonjour,</p>
        <p style="color: #6b7280;">Un nouvel événement a été programmé:</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 4px; font-size: 18px; font-weight: 900; color: #065f46;">{event_title}</p>
            <p style="margin: 0; font-size: 14px; color: #059669;">📅 {event_date} {('🕐 ' + event_time) if event_time else ''}</p>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">{ACADEMY_NAME}</p>
    </div>
    """
    return _send_email(to, f"Événement: {event_title}", html)
