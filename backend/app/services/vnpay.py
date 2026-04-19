import hashlib
import hmac
import urllib.parse
import datetime

from app.core.config import settings

class VNPay:
    def __init__(self):
        self.tmn_code = settings.VNPAY_TMN_CODE
        self.secret_key = settings.VNPAY_HASH_SECRET
        self.vnp_url = settings.VNPAY_URL
        self.return_url = settings.VNPAY_RETURN_URL

    def get_payment_url(self, order_code: str, amount: int, ip_addr: str, order_info: str) -> str:
        inputData = {}
        inputData['vnp_Version'] = '2.1.0'
        inputData['vnp_Command'] = 'pay'
        inputData['vnp_TmnCode'] = self.tmn_code
        inputData['vnp_Amount'] = str(int(amount * 100)) # Số tiền nhân 100
        inputData['vnp_CurrCode'] = 'VND'
        inputData['vnp_TxnRef'] = order_code
        inputData['vnp_OrderInfo'] = order_info
        inputData['vnp_OrderType'] = 'billpayment'
        inputData['vnp_Locale'] = 'vn'
        now = datetime.datetime.now()
        inputData['vnp_CreateDate'] = now.strftime('%Y%m%d%H%M%S')
        inputData['vnp_IpAddr'] = ip_addr
        inputData['vnp_ReturnUrl'] = self.return_url
        
        inputData = dict(sorted(inputData.items()))
        query_string = urllib.parse.urlencode(inputData)
        hashValue = self._hmac_sha512(self.secret_key, query_string)
        return self.vnp_url + "?" + query_string + "&vnp_SecureHash=" + hashValue
        
    def _hmac_sha512(self, key: str, data: str) -> str:
        h = hmac.new(key.encode('utf-8'), data.encode('utf-8'), hashlib.sha512)
        return h.hexdigest()

    def validate_response(self, query_dict: dict) -> bool:
        vnp_SecureHash = query_dict.pop('vnp_SecureHash', None)
        if 'vnp_SecureHashType' in query_dict:
            query_dict.pop('vnp_SecureHashType')
            
        query_dict = dict(sorted(query_dict.items()))
        query_string = urllib.parse.urlencode(query_dict)
        my_hash = self._hmac_sha512(self.secret_key, query_string)
        return my_hash == vnp_SecureHash
