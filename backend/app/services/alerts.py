import logging
import smtplib
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("app.alerts")

def send_alert_simple(subject: str, message: str) -> None:
    """Ghi log cảnh báo mức ERROR và gửi email nếu SMTP được cấu hình."""
    alert_msg = f"[ALERT] {subject}: {message}"
    logger.error(alert_msg)

    # Check if SMTP configuration is present
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD or not settings.MAIL_FROM:
        logger.warning("SMTP email config is missing. Alert email was not sent.")
        return

    try:
        mime_msg = MIMEText(message, "plain", "utf-8")
        mime_msg["Subject"] = f"[{settings.PROJECT_NAME} Alert] {subject}"
        mime_msg["From"] = settings.MAIL_FROM
        mime_msg["To"] = settings.MAIL_FROM  # Send alerts to the sender/admin email itself

        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            server.starttls()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, [settings.MAIL_FROM], mime_msg.as_string())
        
        logger.info(f"Alert email sent successfully to {settings.MAIL_FROM}")
    except Exception as e:
        logger.exception(f"Failed to send alert email: {str(e)}")
