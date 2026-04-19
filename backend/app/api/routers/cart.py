from typing import Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid

from app.api.deps import SessionDep, CurrentUser
from app.models.commerce import Cart, CartItem
from app.models.catalog import Product

router = APIRouter()

class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_slug: str
    quantity: int
    price: float
    sale_price: float | None
    product_image: str | None

class CartResponse(BaseModel):
    id: str
    items: List[CartItemResponse]
    total_amount: float

@router.get("/", response_model=CartResponse)
def get_cart(db: SessionDep, current_user: CurrentUser) -> Any:
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    
    items = []
    total = 0.0
    for item in cart.cart_items:
        prod = item.product
        price_to_use = prod.sale_price if prod.sale_price else prod.price
        items.append(CartItemResponse(
            id=str(item.id),
            product_id=str(prod.id),
            product_name=prod.name,
            product_slug=prod.slug,
            quantity=item.quantity,
            price=float(prod.price),
            sale_price=float(prod.sale_price) if prod.sale_price else None,
            product_image=prod.images.get('main') if prod.images and 'main' in prod.images else (prod.images.get('urls', [''])[0] if prod.images and 'urls' in prod.images and len(prod.images['urls']) > 0 else None)
        ))
        total += float(price_to_use) * item.quantity
        
    return CartResponse(id=str(cart.id), items=items, total_amount=total)

@router.post("/items", response_model=CartResponse)
def add_to_cart(item_in: CartItemCreate, db: SessionDep, current_user: CurrentUser) -> Any:
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        db.flush()
        
    product = db.query(Product).filter(Product.id == uuid.UUID(item_in.product_id)).first()
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
        
    existing_item = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product.id).first()
    
    total_request = (existing_item.quantity if existing_item else 0) + item_in.quantity
    if total_request > product.stock_qty:
         raise HTTPException(status_code=400, detail="Không đủ hàng trong kho")
         
    if existing_item:
        existing_item.quantity += item_in.quantity
    else:
        cart_item = CartItem(cart_id=cart.id, product_id=product.id, quantity=item_in.quantity)
        db.add(cart_item)
        
    db.commit()
    return get_cart(db=db, current_user=current_user)

@router.put("/items/{item_id}", response_model=CartResponse)
def update_cart_item(item_id: str, item_in: CartItemUpdate, db: SessionDep, current_user: CurrentUser) -> Any:
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Giỏ hàng trống")
        
    cart_item = db.query(CartItem).filter(CartItem.id == uuid.UUID(item_id), CartItem.cart_id == cart.id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm trong giỏ")
        
    if item_in.quantity <= 0:
        db.delete(cart_item)
    else:
        if item_in.quantity > cart_item.product.stock_qty:
            raise HTTPException(status_code=400, detail="Không đủ hàng trong kho")
        cart_item.quantity = item_in.quantity
        
    db.commit()
    return get_cart(db=db, current_user=current_user)

@router.delete("/items/{item_id}", response_model=CartResponse)
def remove_cart_item(item_id: str, db: SessionDep, current_user: CurrentUser) -> Any:
    cart = db.query(Cart).filter(Cart.user_id == current_user.id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Giỏ hàng trống")
        
    cart_item = db.query(CartItem).filter(CartItem.id == uuid.UUID(item_id), CartItem.cart_id == cart.id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Không tìm thấy")
        
    db.delete(cart_item)
    db.commit()
    return get_cart(db=db, current_user=current_user)
