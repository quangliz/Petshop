import sys
import os
import random
from faker import Faker
from sqlalchemy.orm import Session
from decimal import Decimal

# Cấu hình path để import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from app.models.catalog import Category, Product

# Dùng Faker ngôn ngữ Tiếng Việt để mồi tự nhiên hơn
fake = Faker('vi_VN')

def seed(db: Session):
    print("Seed categories...")
    dog_cat = Category(name="Chó", slug="cho")
    cat_cat = Category(name="Mèo", slug="meo")
    db.add_all([dog_cat, cat_cat])
    db.commit()
    
    dog_food = Category(name="Thức ăn cho chó", slug="food-cho", parent_id=dog_cat.id)
    cat_food = Category(name="Thức ăn cho mèo", slug="food-meo", parent_id=cat_cat.id)
    toys = Category(name="Đồ chơi", slug="toys")
    db.add_all([dog_food, cat_food, toys])
    db.commit()

    categories = [dog_food, cat_food, toys]
    
    print("Seed 50 products...")
    for _ in range(50):
        cat = random.choice(categories)
        target = "dog" if cat.slug.endswith("cho") else "cat" if cat.slug.endswith("meo") else random.choice(["dog", "cat", "other"])

        name = f"{fake.word().capitalize()} {fake.word()} {target}"
        slug = f"{name.lower().replace(' ', '-')}-{fake.unique.random_int(min=1000, max=9999)}"
        price = Decimal(fake.random_int(min=50, max=500)) * 1000 
        stock = fake.random_int(min=0, max=100)
        
        product = Product(
            category_id=cat.id,
            name=name,
            slug=slug,
            description=fake.paragraph(nb_sentences=3),
            price=price,
            stock_qty=stock,
            brand=fake.company(),
            target_species=[target],
            is_active=True
        )
        db.add(product)
    
    db.commit()
    print("Seed ok!")

if __name__ == "__main__":
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
