from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "ThePawsome"
    API_V1_STR: str = "/api/v1"

    ENVIRONMENT: str = "development"
    AUTO_CREATE_TABLES: bool = False

    # Must be supplied by the runtime environment.
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GUEST_ORDER_TOKEN_EXPIRE_HOURS: int = 24
    COOKIE_SECURE: bool = False

    # Email (Gmail SMTP)
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"

    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse ALLOWED_ORIGINS comma-separated string into a list."""
        return [s.strip() for s in self.ALLOWED_ORIGINS.split(",") if s.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod"}

    @property
    def refresh_cookie_secure(self) -> bool:
        return self.COOKIE_SECURE or self.is_production

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # VNPay Configuration
    VNPAY_TMN_CODE: str = "your_tmn_code"
    VNPAY_HASH_SECRET: str = "your_hash_secret"
    VNPAY_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNPAY_RETURN_URL: str = "http://localhost:3000/orders/payment/callback"
    
    # AI & Cloudinary
    OPENAI_API_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    CHAT_MODEL: str = "gpt-4o-mini"
    AI_EVAL_JUDGE_MODEL: str = "gpt-4o"
    AI_REQUEST_TIMEOUT_SECONDS: float = 60.0
    AI_MAX_RETRIES: int = 2
    AI_EVAL_TOKEN_BUDGET: int = 200000
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # LangSmith tracing — toggled by LANGSMITH_TRACING=true
    LANGSMITH_TRACING: bool = False
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "petshop-ai"
    LANGSMITH_ENDPOINT: str = "https://api.smith.langchain.com"

    # Cohere Rerank config
    COHERE_API_KEY: str = ""
    COHERE_RERANK_MODEL: str = "rerank-multilingual-v3.0"

    # Commerce hardening
    VNPAY_PAYMENT_TTL_MINUTES: int = 15
    INVENTORY_RESERVATION_GRACE_MINUTES: int = 5
    RESERVATION_SWEEP_INTERVAL_SECONDS: int = 60
    PET_AVATAR_MAX_BYTES: int = 5 * 1024 * 1024

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

settings = Settings()
