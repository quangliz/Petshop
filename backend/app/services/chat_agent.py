from typing import List, Optional, Annotated, TypedDict
import operator
import uuid

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, START
from langgraph.prebuilt import ToolNode, tools_condition
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.services.retrieval import search_products, search_knowledge
from app.services.pets_service import get_pet_profile_cached
from app.models.commerce import Cart, CartItem
from app.models.catalog import Product
from app.models.user import Pet


SYSTEM_PROMPT_BASE = (
    "Bạn là Catbot 🐱 — trợ lý AI chuyên gia dinh dưỡng và y tế của ThePawsome. "
    "Bạn rất am hiểu cách chăm sóc thú cưng và luôn trả lời bằng tiếng Việt.\n\n"
    "Quy tắc sử dụng công cụ:\n"
    "- Khi người dùng hỏi về sản phẩm, gợi ý mua hàng, hoặc cần tìm thức ăn/đồ dùng cụ thể: "
    "GỌI tool `search_products` để tìm sản phẩm trong cửa hàng.\n"
    "- Khi người dùng hỏi về dinh dưỡng, sức khỏe, huấn luyện, grooming, đặc điểm giống loài: "
    "GỌI tool `search_knowledge` để tra cứu kho kiến thức trước khi trả lời.\n"
    "- Khi người dùng yêu cầu thêm sản phẩm vào giỏ hàng: GỌI tool `add_to_cart_tool` với slug từ kết quả tìm kiếm.\n"
    "- Khi người dùng hỏi về giỏ hàng của họ: GỌI tool `view_cart_tool`.\n"
    "- Khi người dùng nhắc đến thú cưng của họ (ví dụ: 'bé Mochi', 'con mèo của tôi', 'chó nhà tôi') "
    "mà bạn chưa biết hồ sơ: GỌI tool `list_pets_tool` để xem danh sách thú cưng, sau đó "
    "GỌI `get_pet_detail_tool` với tên hoặc id để lấy hồ sơ chi tiết (tuổi, cân nặng, dị ứng, sức khỏe) "
    "trước khi đưa lời khuyên cá nhân hoá. Nếu người dùng có nhiều thú cưng và chưa rõ đang nói về con nào, "
    "hãy hỏi lại để xác nhận.\n"
    "- Khi trả lời dựa trên kết quả `search_knowledge`, hãy trích dẫn tên bài và link Nguồn nếu có.\n"
    "- Có thể gọi cả hai tool nếu câu hỏi vừa cần kiến thức vừa cần gợi ý sản phẩm.\n"
    "- Sau khi có kết quả tool, trả lời ngắn gọn, có dẫn chứng. Khi muốn giới thiệu sản phẩm, "
    "viết kèm thẻ định dạng `<product>slug-cua-san-pham</product>` ngay trong câu trả lời "
    "(frontend sẽ render thành thẻ sản phẩm). KHÔNG bịa slug — chỉ dùng slug có trong kết quả tool.\n"
    "- Nếu món ăn người dùng hỏi kỵ với dị ứng của thú cưng, hãy cảnh báo rõ ràng.\n"
)


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]


def _build_tools(db: AsyncSession, user_id: uuid.UUID):
    @tool
    async def search_products_tool(query: str, species: Optional[List[str]] = None) -> str:
        """Tìm sản phẩm trong cửa hàng ThePawsome bằng vector similarity.

        Args:
            query: Mô tả sản phẩm cần tìm (ví dụ: 'hạt cho mèo lông dài 5kg').
            species: Lọc theo loài, ví dụ ['cat'] hoặc ['dog']. Bỏ qua nếu không chắc.

        Returns: Danh sách top-5 sản phẩm dạng văn bản, kèm slug để dùng trong thẻ <product>.
        """
        results = await search_products(db, query=query, limit=5, species=species)
        if not results:
            return "Không tìm thấy sản phẩm phù hợp."
        lines = []
        for r in results:
            price = r["sale_price"] or r["price"]
            lines.append(
                f"- slug={r['slug']} | {r['name']} ({r['brand'] or 'không rõ thương hiệu'}) "
                f"| giá: {price:,.0f}đ"
            )
        return "\n".join(lines)

    @tool
    def search_knowledge_tool(query: str) -> str:
        """Tìm trong kho kiến thức chăm sóc thú cưng (dinh dưỡng, sức khỏe, huấn luyện, grooming, giống loài).

        Args:
            query: Câu hỏi hoặc chủ đề cần tra cứu.

        Returns: Tối đa 4 đoạn kiến thức liên quan, kèm tiêu đề bài.
        """
        results = search_knowledge(query=query, limit=4)
        if not results:
            return "Không tìm thấy kiến thức liên quan."
        parts = []
        for r in results:
            source_line = f"Nguồn: {r['source_url']}" if r.get('source_url') else ""
            entry = f"[{r['title']} — {r['category']}]\n{r['content']}"
            if source_line:
                entry += f"\n{source_line}"
            parts.append(entry)
        return "\n\n".join(parts)

    @tool
    async def add_to_cart_tool(slug: str, quantity: int = 1) -> str:
        """Thêm sản phẩm vào giỏ hàng của người dùng.

        Args:
            slug: Slug của sản phẩm (lấy từ kết quả search_products).
            quantity: Số lượng cần thêm (mặc định 1).

        Returns: Thông báo xác nhận hoặc lỗi bằng tiếng Việt.
        """
        # Resolve slug → Product
        result = await db.execute(
            select(Product).where(Product.slug == slug, Product.is_active)
        )
        product = result.scalar_one_or_none()
        if not product:
            return f"Không tìm thấy sản phẩm '{slug}' hoặc sản phẩm không còn bán."

        # Get or create Cart for this user
        result = await db.execute(select(Cart).where(Cart.user_id == user_id))
        cart = result.scalar_one_or_none()
        if not cart:
            cart = Cart(user_id=user_id)
            db.add(cart)
            await db.flush()

        # Get existing CartItem
        result = await db.execute(
            select(CartItem).where(
                CartItem.cart_id == cart.id,
                CartItem.product_id == product.id,
            )
        )
        existing = result.scalar_one_or_none()

        total_qty = (existing.quantity if existing else 0) + quantity
        if total_qty > product.stock_qty:
            return f"Không đủ hàng trong kho. Hiện chỉ còn {product.stock_qty} sản phẩm."

        if existing:
            existing.quantity += quantity
        else:
            db.add(CartItem(cart_id=cart.id, product_id=product.id, quantity=quantity))

        await db.commit()
        price = float(product.sale_price if product.sale_price else product.price)
        return (
            f"✓ Đã thêm {quantity}x **{product.name}** vào giỏ hàng. "
            f"Giá: {price:,.0f}đ/sản phẩm."
        )

    @tool
    async def view_cart_tool() -> str:
        """Xem danh sách sản phẩm trong giỏ hàng hiện tại.

        Returns: Danh sách sản phẩm trong giỏ hàng dạng văn bản tiếng Việt.
        """
        result = await db.execute(
            select(Cart)
            .where(Cart.user_id == user_id)
            .options(selectinload(Cart.cart_items).selectinload(CartItem.product))
        )
        cart = result.scalar_one_or_none()
        if not cart or not cart.cart_items:
            return "Giỏ hàng của bạn đang trống."

        lines = []
        total = 0.0
        for item in cart.cart_items:
            prod = item.product
            price = float(prod.sale_price if prod.sale_price else prod.price)
            subtotal = price * item.quantity
            total += subtotal
            lines.append(
                f"- {prod.name} × {item.quantity} = {subtotal:,.0f}đ"
            )
        lines.append(f"\nTổng cộng: {total:,.0f}đ")
        return "Giỏ hàng của bạn:\n" + "\n".join(lines)

    @tool
    async def list_pets_tool() -> str:
        """Liệt kê tất cả thú cưng của người dùng hiện tại (tên, loài, giống, tuổi).

        Dùng khi người dùng nhắc đến thú cưng nhưng chưa rõ đang nói về con nào, hoặc khi
        cần biết người dùng có những thú cưng nào trước khi tư vấn.

        Returns: Danh sách thú cưng dạng văn bản tiếng Việt, kèm id để dùng với get_pet_detail_tool.
        """
        result = await db.execute(
            select(Pet).where(Pet.user_id == user_id).order_by(Pet.created_at.asc())
        )
        pets = result.scalars().all()
        if not pets:
            return "Người dùng chưa thêm thú cưng nào vào hồ sơ."
        lines = []
        for p in pets:
            lines.append(
                f"- id={p.id} | {p.name} ({p.species.value}"
                f"{', ' + p.breed if p.breed else ''}"
                f"{', ' + str(p.age_months) + ' tháng tuổi' if p.age_months else ''})"
            )
        return "Danh sách thú cưng:\n" + "\n".join(lines)

    @tool
    async def get_pet_detail_tool(identifier: str) -> str:
        """Lấy hồ sơ chi tiết của một thú cưng (tuổi, cân nặng, sức khỏe, dị ứng).

        Args:
            identifier: Tên thú cưng (ví dụ 'Mochi') hoặc UUID lấy từ list_pets_tool.
                Nếu truyền tên, khớp không phân biệt hoa thường.

        Returns: Hồ sơ chi tiết dạng văn bản tiếng Việt, hoặc thông báo nếu không tìm thấy.
        """
        pet: Optional[Pet] = None
        try:
            pet_uuid = uuid.UUID(identifier)
            result = await db.execute(
                select(Pet).where(Pet.id == pet_uuid, Pet.user_id == user_id)
            )
            pet = result.scalar_one_or_none()
        except (ValueError, AttributeError):
            pass

        if not pet:
            result = await db.execute(
                select(Pet).where(Pet.user_id == user_id)
            )
            pets = result.scalars().all()
            matches = [p for p in pets if p.name.lower() == identifier.lower().strip()]
            if not matches:
                matches = [p for p in pets if identifier.lower().strip() in p.name.lower()]
            if len(matches) == 1:
                pet = matches[0]
            elif len(matches) > 1:
                names = ", ".join(f"{p.name} (id={p.id})" for p in matches)
                return f"Có nhiều thú cưng khớp '{identifier}': {names}. Hãy hỏi người dùng để xác nhận."

        if not pet:
            return f"Không tìm thấy thú cưng '{identifier}' trong hồ sơ của người dùng."

        return await get_pet_profile_cached(pet)

    return [
        search_products_tool,
        search_knowledge_tool,
        add_to_cart_tool,
        view_cart_tool,
        list_pets_tool,
        get_pet_detail_tool,
    ]


def build_agent(db: AsyncSession, user_id: uuid.UUID):
    """Build a per-request StateGraph agent: agent ⇄ tools.

    Graph:
        START → agent → tools_condition ─┬─ tools → agent
                                         └─ END
    """
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,
    )
    tools = _build_tools(db, user_id)
    llm_with_tools = llm.bind_tools(tools)

    async def agent_node(state: AgentState):
        response = await llm_with_tools.ainvoke(state["messages"])
        return {"messages": [response]}

    workflow = StateGraph(AgentState)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(tools))
    workflow.add_edge(START, "agent")
    # tools_condition routes to "tools" OR END — do NOT also add_edge to END
    workflow.add_conditional_edges("agent", tools_condition)
    workflow.add_edge("tools", "agent")
    return workflow.compile()


def build_system_prompt(pet_context: str = "", product_context: str = "") -> str:
    prompt = SYSTEM_PROMPT_BASE
    if pet_context:
        prompt += (
            "\nThông tin thú cưng đang được tư vấn:\n"
            f"{pet_context}\n"
            "Hãy cá nhân hoá lời khuyên dựa vào hồ sơ trên.\n"
        )
    if product_context:
        prompt += (
            "\nNgười dùng đang xem sản phẩm:\n"
            f"{product_context}\n"
            "Nếu người dùng hỏi chung chung (\"sản phẩm này thế nào?\", \"có tốt không?\"), "
            "hãy hiểu là họ đang hỏi về sản phẩm trên. Chủ động tư vấn nếu phù hợp.\n"
        )
    return prompt
