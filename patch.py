import re

with open("backend/app/api/routers/products.py", "r") as f:
    content = f.read()

content = content.replace(
    "    product_images: Optional[List[Any]] = None",
    "    product_images: Optional[List[Any]] = None\n    avg_rating: Optional[float] = None\n    review_count: Optional[int] = 0\n    sold_count: Optional[int] = 0"
)

with open("backend/app/api/routers/products.py", "w") as f:
    f.write(content)
