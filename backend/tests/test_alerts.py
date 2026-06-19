from unittest.mock import patch, MagicMock
from app.services.alerts import send_alert_simple

def test_send_alert_simple_missing_config():
    with patch("app.services.alerts.settings") as mock_settings, \
         patch("app.services.alerts.logger") as mock_logger:

        mock_settings.MAIL_USERNAME = None
        mock_settings.MAIL_PASSWORD = None
        mock_settings.MAIL_FROM = None

        send_alert_simple("Test Subject", "Test Message")

        mock_logger.error.assert_called_once_with("[ALERT] Test Subject: Test Message")
        mock_logger.warning.assert_called_once_with("SMTP email config is missing. Alert email was not sent.")

def test_send_alert_simple_success():
    with patch("app.services.alerts.settings") as mock_settings, \
         patch("app.services.alerts.logger") as mock_logger, \
         patch("app.services.alerts.smtplib.SMTP") as mock_smtp:

        mock_settings.MAIL_USERNAME = "user"
        mock_settings.MAIL_PASSWORD = "password"
        mock_settings.MAIL_FROM = "sender@example.com"
        mock_settings.MAIL_SERVER = "smtp.example.com"
        mock_settings.MAIL_PORT = 587
        mock_settings.PROJECT_NAME = "Test Project"

        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        send_alert_simple("Test Subject", "Test Message")

        mock_logger.error.assert_called_once_with("[ALERT] Test Subject: Test Message")
        mock_smtp.assert_called_once_with("smtp.example.com", 587)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("user", "password")
        mock_server.sendmail.assert_called_once()
        mock_logger.info.assert_called_once_with("Alert email sent successfully to sender@example.com")

def test_send_alert_simple_exception():
    with patch("app.services.alerts.settings") as mock_settings, \
         patch("app.services.alerts.logger") as mock_logger, \
         patch("app.services.alerts.smtplib.SMTP") as mock_smtp:

        mock_settings.MAIL_USERNAME = "user"
        mock_settings.MAIL_PASSWORD = "password"
        mock_settings.MAIL_FROM = "sender@example.com"
        mock_settings.MAIL_SERVER = "smtp.example.com"
        mock_settings.MAIL_PORT = 587
        mock_settings.PROJECT_NAME = "Test Project"

        mock_smtp.side_effect = Exception("SMTP Connection Failed")

        send_alert_simple("Test Subject", "Test Message")

        mock_logger.error.assert_called_once_with("[ALERT] Test Subject: Test Message")
        mock_logger.exception.assert_called_once_with("Failed to send alert email: SMTP Connection Failed")
