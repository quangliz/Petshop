import datetime
from app.core.config import settings

class SePay:
    def __init__(self):
        self.api_key = settings.SEPAY_API_KEY
        self.account_number = settings.SEPAY_ACCOUNT_NUMBER
        self.account_name = settings.SEPAY_ACCOUNT_NAME
        self.bank = settings.SEPAY_BANK

    def get_payment_url(
        self,
        order_code: str,
        amount: float,
    ) -> str:
        """
        Generates a VietQR code URL via SePay for scanning bank transfer.
        Cấu trúc: https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG
        """
        import urllib.parse
        
        params = {
            "acc": self.account_number,
            "bank": self.bank,
            "amount": int(amount),
            "des": order_code,
            "template": "compact",
            "acc_name": self.account_name
        }
        query_string = urllib.parse.urlencode(params)
        return f"https://qr.sepay.vn/img?{query_string}"
