FROM python:3.11-slim AS builder
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --frozen

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /app/.venv .venv
COPY . .
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)" || exit 1
ENTRYPOINT ["./entrypoint.sh"]
