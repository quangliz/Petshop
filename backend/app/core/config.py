import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PetShop AI"
    API_V1_STR: str = "/api/v1"
    
    # Ở production, bạn nên override biến này trong file .env
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 ngày
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # VNPay Configuration
    VNPAY_TMN_CODE: str = "your_tmn_code"
    VNPAY_HASH_SECRET: str = "your_hash_secret"
    VNPAY_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNPAY_RETURN_URL: str = "http://localhost:3000/orders/payment/callback"
    
    # AI & Cloudinary
    OPENAI_API_KEY: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
