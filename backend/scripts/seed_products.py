"""Seed ~50 realistic Vietnamese pet products with public brands + Unsplash images.

Run: uv run python scripts/seed_products.py
"""
import sys
import os
from decimal import Decimal
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models.catalog import Category, Product


PRODUCTS = [
    # Dog Food - Dry
    {
        "name": "Royal Canin Maxi Adult 15kg",
        "brand": "Royal Canin",
        "category_slug": "dog-food-dry",
        "description": "Thức ăn chuyên dụng cho chó lớn trưởng thành, 2-7 năm tuổi. Hỗ trợ tiêu hóa tốt, lông khỏe.",
        "price": Decimal("1200000"),
        "stock_qty": 8,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Pedigree Puppy Growth 1.2kg",
        "brand": "Pedigree",
        "category_slug": "dog-food-dry",
        "description": "Thức ăn cho chó con 2-12 tháng tuổi. Giàu canxi, phospho, vitamin, giúp phát triển xương khỏe.",
        "price": Decimal("180000"),
        "stock_qty": 15,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
    {
        "name": "SmartHeart Chicken & Rice 20kg",
        "brand": "SmartHeart",
        "category_slug": "dog-food-dry",
        "description": "Hạt cho chó lớn giá rẻ, có chicken, lành tính, không chứa thịt thừa.",
        "price": Decimal("450000"),
        "stock_qty": 12,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=500&h=500&fit=crop"},
    },
    {
        "name": "ANF Grain Free Duck 15kg",
        "brand": "ANF (All Natural Formula)",
        "category_slug": "dog-food-dry",
        "description": "Thức ăn hạt không ngũ cốc cho chó, dùng vịt và rau quả tự nhiên. Phù hợp chó dị ứng lúa mì.",
        "price": Decimal("980000"),
        "stock_qty": 6,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=500&h=500&fit=crop"},
    },
    {
        "name": "AAFCO Premium Beef 10kg",
        "brand": "AAFCO",
        "category_slug": "dog-food-dry",
        "description": "Thức ăn hạt cao cấp với thịt bò tươi, đủ dinh dưỡng, lông sáng.",
        "price": Decimal("650000"),
        "stock_qty": 9,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },

    # Dog Food - Wet
    {
        "name": "Pedigree Wet Food Beef 400g",
        "brand": "Pedigree",
        "category_slug": "dog-food-wet",
        "description": "Thức ăn mềm cho chó, dạng pâté với thịt bò thật. Dễ tiêu, ngon miệng.",
        "price": Decimal("35000"),
        "stock_qty": 50,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Cesar Wet Chicken & Vegetables 100g",
        "brand": "Cesar",
        "category_slug": "dog-food-wet",
        "description": "Cơm chó ướt nhỏ xinh (100g gói), gà + rau, lành tính cho chó nhỏ.",
        "price": Decimal("15000"),
        "stock_qty": 100,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },

    # Cat Food - Dry
    {
        "name": "Whiskas Adult Cat 1.2kg",
        "brand": "Whiskas",
        "category_slug": "cat-food-dry",
        "description": "Hạt mèo trưởng thành, hỗ trợ tiêu hóa tốt, lông bóng mượt, vị cá biển.",
        "price": Decimal("120000"),
        "stock_qty": 20,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Me-O Kitten Mackerel 350g",
        "brand": "Me-O",
        "category_slug": "cat-food-dry",
        "description": "Hạt mèo con (4-12 tuần), cá cơm, dễ nhai, giàu DHA cho phát triển não.",
        "price": Decimal("75000"),
        "stock_qty": 25,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=500&h=500&fit=crop"},
    },
    {
        "name": "Royal Canin Feline Urinary Care 4kg",
        "brand": "Royal Canin",
        "category_slug": "cat-food-dry",
        "description": "Hạt mèo chuyên trị sỏi tiết niệu, kiểm soát pH nước tiểu, ngừa viêm đường tiểu.",
        "price": Decimal("850000"),
        "stock_qty": 5,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Catsrang Premium Fish 2kg",
        "brand": "Catsrang",
        "category_slug": "cat-food-dry",
        "description": "Hạt mèo cao cấp Thái Lan, hương cá tự nhiên, no lâu, hỗ trợ chăm sóc lông.",
        "price": Decimal("280000"),
        "stock_qty": 14,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
    {
        "name": "Bio Premium Cat 1.5kg",
        "brand": "Bio",
        "category_slug": "cat-food-dry",
        "description": "Thức ăn mèo từ Đức, không chứa ngũ cốc không cần thiết, công thức cân bằng.",
        "price": Decimal("350000"),
        "stock_qty": 8,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },

    # Cat Food - Wet
    {
        "name": "Sheba Wet Cat Chicken Feast 50g",
        "brand": "Sheba",
        "category_slug": "cat-food-wet",
        "description": "Pâté mèo gói 50g, nhiều vị (gà, cá, thịt). Dễ ăn, hấp dẫn.",
        "price": Decimal("12000"),
        "stock_qty": 150,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
    {
        "name": "Fancy Feast Wet Cat Seafood Mix 85g",
        "brand": "Fancy Feast",
        "category_slug": "cat-food-wet",
        "description": "Cơm mèo ướt 85g gói, vị hải sản hỗn hợp (cá, tôm), mềm mịn.",
        "price": Decimal("18000"),
        "stock_qty": 120,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },

    # Dog Treats
    {
        "name": "Pedigree Dentastix Medium 7 sticks",
        "brand": "Pedigree",
        "category_slug": "dog-treats",
        "description": "Que gặm chó giúp làm sạch răng, giảm mảng bám cao 80%, vị cố gắng mềm.",
        "price": Decimal("65000"),
        "stock_qty": 30,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
    {
        "name": "Greenies Original Dog Dental Treats 340g",
        "brand": "Greenies",
        "category_slug": "dog-treats",
        "description": "Bánh gặm giúp làm sạch răng và hôi miệng, thiên nhiên, an toàn.",
        "price": Decimal("220000"),
        "stock_qty": 12,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=500&h=500&fit=crop"},
    },
    {
        "name": "Kong Stuffable Chew Toy Small",
        "brand": "Kong",
        "category_slug": "dog-toys",
        "description": "Đồ chơi nhai cao su cho chó, đỏ, có thể nhồi thức ăn hoặc bơ lạc vào. Bền bỉ.",
        "price": Decimal("85000"),
        "stock_qty": 15,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },

    # Cat Treats
    {
        "name": "Temptations Cat Treats Chicken 85g",
        "brand": "Temptations",
        "category_slug": "cat-treats",
        "description": "Bánh thưởng mèo vị gà, crunch ngon, lõi mềm, hấp dẫn mèo lười.",
        "price": Decimal("45000"),
        "stock_qty": 40,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
    {
        "name": "Greenies Feline Dental Treats 60g",
        "brand": "Greenies",
        "category_slug": "cat-treats",
        "description": "Bánh gặm mèo giúp làm sạch răng, vị bạc hà tự nhiên.",
        "price": Decimal("65000"),
        "stock_qty": 20,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },

    # Accessories - Litter
    {
        "name": "Cát Vệ Sinh Bentonite Khối 10kg",
        "brand": "Bentonite",
        "category_slug": "cat-litter",
        "description": "Cát vệ sinh khối hút mùi mạnh, dễ vón, ít bụi, lâu thay.",
        "price": Decimal("150000"),
        "stock_qty": 25,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Cát Vệ Sinh Silica Gel 5L",
        "brand": "Silica",
        "category_slug": "cat-litter",
        "description": "Cát silica gel hút ẩm tốt, ít bụi, thơm khử mùi, tiết kiệm.",
        "price": Decimal("180000"),
        "stock_qty": 18,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
    {
        "name": "Cát Vệ Sinh Cỏ Lúa Mạch 6kg",
        "brand": "Grass",
        "category_slug": "cat-litter",
        "description": "Cát vệ sinh thiên nhiên từ cỏ lúa mạch, 100% sinh học, an toàn cho mèo.",
        "price": Decimal("220000"),
        "stock_qty": 12,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },

    # Accessories - Toys
    {
        "name": "Feather Wand Cat Toy",
        "brand": "Generic",
        "category_slug": "cat-toys",
        "description": "Cần câu lông vũ cho mèo, kích thích chơi, hỗ trợ vận động.",
        "price": Decimal("35000"),
        "stock_qty": 50,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Interactive Laser Pointer Toy",
        "brand": "Generic",
        "category_slug": "cat-toys",
        "description": "Bút laser chỉ chiếu cho mèo chơi, an toàn, pin lâu.",
        "price": Decimal("55000"),
        "stock_qty": 30,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
    {
        "name": "Ball Toy for Cat 5cm",
        "brand": "Generic",
        "category_slug": "cat-toys",
        "description": "Quả bóng đồ chơi mèo, có chuông, nảy tốt.",
        "price": Decimal("15000"),
        "stock_qty": 80,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },

    # Accessories - Collars & Leashes
    {
        "name": "Dog Collar Adjustable Nylon L",
        "brand": "Generic",
        "category_slug": "dog-accessories",
        "description": "Vòng cổ chó vải có thể điều chỉnh kích thước, nhiều màu.",
        "price": Decimal("45000"),
        "stock_qty": 40,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Dog Leash 1.5m Reflective",
        "brand": "Generic",
        "category_slug": "dog-accessories",
        "description": "Dây dắt chó 1.5m, vải phản quang, đôi, an toàn ban đêm.",
        "price": Decimal("65000"),
        "stock_qty": 25,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
    {
        "name": "Cat Harness Adjustable Soft",
        "brand": "Generic",
        "category_slug": "cat-accessories",
        "description": "Giải ngoại áo chó mèo, vải mềm, an toàn, có thể điều chỉnh.",
        "price": Decimal("85000"),
        "stock_qty": 15,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },

    # Healthcare
    {
        "name": "Dog Shampoo Natural 500ml",
        "brand": "Generic",
        "category_slug": "pet-healthcare",
        "description": "Dầu gội chó từ thiên nhiên, không hóa chất, dịu nhẹ, thơm.",
        "price": Decimal("95000"),
        "stock_qty": 20,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Cat Flea & Tick Collar 6 months",
        "brand": "Seresto",
        "category_slug": "pet-healthcare",
        "description": "Vòng cổ chống ve bọ chét 6 tháng, an toàn, hiệu quả cao.",
        "price": Decimal("280000"),
        "stock_qty": 10,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
    {
        "name": "Pet Wet Wipes Unscented 100 pcs",
        "brand": "Generic",
        "category_slug": "pet-healthcare",
        "description": "Khăn ướt vệ sinh cho chó mèo, không hương liệu, an toàn.",
        "price": Decimal("55000"),
        "stock_qty": 35,
        "target_species": ["dog", "cat"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Dog Nail Clippers Stainless Steel",
        "brand": "Generic",
        "category_slug": "pet-healthcare",
        "description": "Kéo cắt móng chó inox, an toàn, lưỡi sắc.",
        "price": Decimal("75000"),
        "stock_qty": 22,
        "target_species": ["dog"],
        "images": {"main": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500&h=500&fit=crop"},
    },
    {
        "name": "Cat Toothbrush Set Soft Bristle",
        "brand": "Generic",
        "category_slug": "pet-healthcare",
        "description": "Bộ bàn chải đánh răng mèo 3 cái, lông mềm, không đau lợi.",
        "price": Decimal("65000"),
        "stock_qty": 18,
        "target_species": ["cat"],
        "images": {"main": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500&h=500&fit=crop"},
    },
]


def main():
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        # Ensure categories exist
        categories = {
            "dog-food-dry": ("Thức ăn chó khô", "dog-food-dry"),
            "dog-food-wet": ("Thức ăn chó ướt", "dog-food-wet"),
            "cat-food-dry": ("Thức ăn mèo khô", "cat-food-dry"),
            "cat-food-wet": ("Thức ăn mèo ướt", "cat-food-wet"),
            "dog-treats": ("Bánh thưởng chó", "dog-treats"),
            "cat-treats": ("Bánh thưởng mèo", "cat-treats"),
            "dog-toys": ("Đồ chơi chó", "dog-toys"),
            "cat-toys": ("Đồ chơi mèo", "cat-toys"),
            "dog-accessories": ("Phụ kiện chó", "dog-accessories"),
            "cat-accessories": ("Phụ kiện mèo", "cat-accessories"),
            "cat-litter": ("Cát vệ sinh mèo", "cat-litter"),
            "pet-healthcare": ("Chăm sóc sức khỏe", "pet-healthcare"),
        }

        for slug, (name, _) in categories.items():
            existing = db.query(Category).filter(Category.slug == slug).first()
            if not existing:
                cat = Category(name=name, slug=slug)
                db.add(cat)
        db.commit()

        # Get category IDs
        cat_map = {}
        for slug, _ in categories.items():
            cat = db.query(Category).filter(Category.slug == slug).first()
            if cat:
                cat_map[slug] = cat.id

        # Add products
        added = 0
        for prod_data in PRODUCTS:
            existing = db.query(Product).filter(Product.name == prod_data["name"]).first()
            if existing:
                continue

            cat_id = cat_map.get(prod_data["category_slug"])
            slug = f"{prod_data['name'].lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}"

            product = Product(
                category_id=cat_id,
                name=prod_data["name"],
                slug=slug,
                description=prod_data["description"],
                price=prod_data["price"],
                stock_qty=prod_data["stock_qty"],
                brand=prod_data["brand"],
                target_species=prod_data["target_species"],
                images=prod_data["images"],
                is_active=True,
            )
            db.add(product)
            added += 1

        db.commit()
        print(f"✓ Seeded {added} products across {len(cat_map)} categories.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
