"""
Email service for sending notifications via SMTP.
Configure in .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings

logger = logging.getLogger("email")

SMTP_HOST = settings.SMTP_HOST
SMTP_PORT = settings.SMTP_PORT
SMTP_USER = settings.SMTP_USER or ""
SMTP_PASS = settings.SMTP_PASS or ""
SMTP_FROM = settings.SMTP_FROM
ACADEMY_NAME = "Football Academy SaaS"


def _frontend_url() -> str:
    """Resolved at call time so tests can monkeypatch settings.FRONTEND_URL."""
    return settings.FRONTEND_URL or "https://academy-app-mu.vercel.app"


def _send_email(to: str, subject: str, html_body: str):
    """Send an email via SMTP. Silently fails if SMTP is not configured."""
    if not SMTP_USER or not SMTP_PASS:
        logger.info(f"SMTP not configured. Would send to {to}: {subject}")
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

        logger.info(f"Sent to {to}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send to {to}: {e}")
        return False


def send_welcome_email(to: str, name: str):
    """Send welcome email to new user."""
    login_url = f"{_frontend_url()}/login"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0;">⚽ Bienvenue!</h1>
        </div>
        <p style="font-size: 16px; color: #374151;">Bonjour <strong>{name}</strong>,</p>
        <p style="color: #6b7280;">Votre compte {ACADEMY_NAME} a été créé avec succès. Vous pouvez maintenant accéder à votre espace.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{login_url}" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 14px;">Accéder à mon espace</a>
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


def send_otp_email(to: str, code: str, purpose: str = "verify"):
    """Send 6-digit OTP code for email verification or password reset."""
    title = "Code de vérification" if purpose == "verify" else "Réinitialisation du mot de passe"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0;">🔐 {title}</h1>
        </div>
        <p style="font-size: 16px; color: #374151;">Voici votre code de vérification:</p>
        <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: #f0f0ff; border: 2px solid #4f46e5; border-radius: 16px; padding: 20px 40px; letter-spacing: 12px; font-size: 36px; font-weight: 900; color: #1e1b4b; font-family: monospace;">
                {code}
            </div>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Ce code expire dans <strong>10 minutes</strong>.</p>
        <p style="color: #9ca3af; font-size: 12px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px;">{ACADEMY_NAME}</p>
    </div>
    """
    return _send_email(to, f"{title} — {code}", html)


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


def send_payment_receipt(
    to: str,
    payer_name: str,
    amount: float,
    currency: str,
    plan_name: str,
    order_id: str,
    paid_at: str,
):
    """Send a payment receipt after a successful PayPal capture."""
    dashboard_url = f"{_frontend_url()}/saas/subscriptions"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0;">✅ Paiement reçu</h1>
        </div>
        <p style="font-size: 16px; color: #374151;">Bonjour <strong>{payer_name}</strong>,</p>
        <p style="color: #6b7280;">Nous avons bien reçu votre paiement. Voici le récapitulatif:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Plan</td><td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a;">{plan_name}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Montant</td><td style="padding: 8px 0; text-align: right; font-weight: 900; color: #059669; font-size: 20px;">{amount:.2f} {currency}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Référence</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px; color: #475569;">{order_id}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date</td><td style="padding: 8px 0; text-align: right; color: #475569; font-size: 14px;">{paid_at}</td></tr>
            </table>
        </div>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{dashboard_url}" style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 14px;">Voir mon abonnement</a>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">{ACADEMY_NAME} — Conservez cet email comme preuve de paiement.</p>
    </div>
    """
    return _send_email(to, f"Reçu de paiement — {plan_name} ({amount:.2f} {currency})", html)


def send_renewal_reminder(to: str, academy_name: str, plan_name: str, renewal_date: str, days_until: int, amount: float, currency: str = "MAD"):
    """Send a renewal reminder email to an academy admin (triggered by scheduled cron)."""
    when_text = "aujourd'hui" if days_until == 0 else f"dans {days_until} jour(s)"
    dashboard_url = f"{_frontend_url()}/admin/subscription"
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0;">⏰ Rappel de renouvellement</h1>
        </div>
        <p style="font-size: 16px; color: #374151;">Bonjour,</p>
        <p style="color: #6b7280;">L'abonnement <strong>{plan_name.capitalize()}</strong> de <strong>{academy_name}</strong> sera renouvelé <strong>{when_text}</strong>.</p>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #1e40af; font-size: 14px;">Date de renouvellement</td><td style="padding: 6px 0; text-align: right; font-weight: 700; color: #1e3a8a;">{renewal_date}</td></tr>
                <tr><td style="padding: 6px 0; color: #1e40af; font-size: 14px;">Montant</td><td style="padding: 6px 0; text-align: right; font-weight: 900; color: #1e3a8a; font-size: 20px;">{amount:.0f} {currency}</td></tr>
            </table>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Assurez-vous que votre méthode de paiement est à jour pour éviter toute interruption de service.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{dashboard_url}" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 900; font-size: 14px;">Gérer mon abonnement</a>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">{ACADEMY_NAME}</p>
    </div>
    """
    return _send_email(to, f"Rappel: Renouvellement {plan_name.capitalize()} — {academy_name}", html)


def send_overdue_notification(to: str, player_name: str, amount: float, days_overdue: int, due_date: str):
    """Send an overdue payment notification (intended to be triggered by a scheduler)."""
    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; font-size: 24px; margin: 0;">⚠️ Paiement en retard</h1>
        </div>
        <p style="font-size: 16px; color: #374151;">Bonjour,</p>
        <p style="color: #6b7280;">Le paiement pour <strong>{player_name}</strong> est en retard de <strong>{days_overdue} jour(s)</strong>.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #991b1b;">Montant dû</p>
            <p style="margin: 0; font-size: 28px; font-weight: 900; color: #7f1d1d;">{amount:.2f} MAD</p>
            <p style="margin: 12px 0 0; font-size: 13px; color: #b91c1c;">Échéance dépassée: {due_date}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Merci de régulariser la situation au plus vite pour éviter toute interruption de service.</p>
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">{ACADEMY_NAME}</p>
    </div>
    """
    return _send_email(to, f"⚠️ Retard de paiement — {player_name}", html)
