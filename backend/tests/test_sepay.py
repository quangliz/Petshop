from unittest.mock import patch
import urllib.parse
from app.services.sepay import SePay

def test_sepay_get_payment_url():
    # Setup expected deterministic settings values
    expected_account_number = "TESTACC123"
    expected_bank = "TestBank"
    expected_account_name = "TEST USER"

    with patch("app.services.sepay.settings.SEPAY_ACCOUNT_NUMBER", expected_account_number), \
         patch("app.services.sepay.settings.SEPAY_BANK", expected_bank), \
         patch("app.services.sepay.settings.SEPAY_ACCOUNT_NAME", expected_account_name):

        # Instantiate SePay after patching settings
        sepay = SePay()

        order_code = "ORD-987654321"
        amount = 150000.0

        # Call the method to generate URL
        url = sepay.get_payment_url(order_code, amount)

        # The URL structure is: https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG
        # Let's verify it starts with the correct base URL
        assert url.startswith("https://qr.sepay.vn/img?")

        # Extract query parameters
        query_string = url.split("?")[1]
        params = urllib.parse.parse_qs(query_string)

        # Verify the query parameters
        assert params["acc"][0] == expected_account_number
        assert params["bank"][0] == expected_bank
        assert params["amount"][0] == str(int(amount))
        assert params["des"][0] == order_code
        assert params["template"][0] == "compact"
        assert params["acc_name"][0] == expected_account_name
