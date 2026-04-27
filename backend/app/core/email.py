from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

from app.core.config import settings


def _get_mail_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM or settings.MAIL_USERNAME,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
    )


async def send_reset_email(email: str, reset_link: str) -> None:
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="color:#333">Đặt lại mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới để tiếp tục:</p>
        <a href="{reset_link}"
           style="display:inline-block;padding:12px 28px;background:#10b981;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
            Đặt lại mật khẩu
        </a>
        <p style="font-size:13px;color:#888">Link này sẽ hết hạn sau 15 phút.
        Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
    """
    message = MessageSchema(
        subject="ThePawsome - Đặt lại mật khẩu",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )
    fm = FastMail(_get_mail_config())
    await fm.send_message(message)
