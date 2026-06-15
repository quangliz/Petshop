from typing import List, Optional, Annotated, TypedDict
import operator
import uuid
import asyncio

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage, ToolMessage
from langgraph.graph import StateGraph, START
from langgraph.prebuilt import tools_condition
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.services.retrieval import search_forum_discussions, search_products, search_knowledge
from app.services.pets_service import get_pet_profile_cached
from app.models.user import Pet
from app.models.chat import ChatSession, ChatRoutingStatusEnum
from app.services.ai_safety import DOMAIN_POLICY, sanitize_retrieved_content


SYSTEM_PROMPT_BASE = (
    "Bạn là Catbot 🐱 — trợ lý AI chuyên gia dinh dưỡng và y tế của ThePawsome. "
    "Bạn rất am hiểu cách chăm sóc thú cưng và luôn trả lời bằng tiếng Việt.\n\n"
    "Quy tắc sử dụng công cụ:\n"
    "- Khi người dùng hỏi về sản phẩm, gợi ý mua hàng, hoặc cần tìm thức ăn/đồ dùng cụ thể: "
    "GỌI tool `search_products` để tìm sản phẩm trong cửa hàng.\n"
    "- Khi người dùng hỏi về dinh dưỡng, sức khỏe, huấn luyện, grooming, đặc điểm giống loài: "
    "GỌI tool `search_knowledge` để tra cứu kho kiến thức trước khi trả lời.\n"
    "- Bạn chỉ tư vấn sản phẩm và giải đáp thắc mắc, KHÔNG có khả năng xem giỏ hàng hoặc thực hiện hành động thêm sản phẩm vào giỏ hàng/thanh toán. Nếu người dùng muốn mua hoặc thêm vào giỏ hàng, hãy hướng dẫn họ tự bấm nút 'Thêm vào giỏ hàng' trên thẻ sản phẩm được hiển thị hoặc truy cập vào trang giỏ hàng.\n"
    "- Khi người dùng nhắc đến thú cưng của họ (ví dụ: 'bé Mochi', 'con mèo của tôi', 'chó nhà tôi') "
    "mà bạn chưa biết hồ sơ: GỌI tool `list_pets_tool` để xem danh sách thú cưng, sau đó "
    "GỌI `get_pet_detail_tool` với tên hoặc id để lấy hồ sơ chi tiết (tuổi, cân nặng, dị ứng, sức khỏe) "
    "trước khi đưa lời khuyên cá nhân hoá. Nếu người dùng có nhiều thú cưng và chưa rõ đang nói về con nào, "
    "hãy hỏi lại để xác nhận.\n"
    "- Khi trả lời dựa trên kết quả `search_knowledge`, hãy trích dẫn bằng cách chèn link Nguồn dưới dạng markdown link nếu có. Các đường dẫn tương đối (bắt đầu bằng `/` như `/forum/slug`) PHẢI được giữ nguyên dạng tương đối, tuyệt đối KHÔNG tự ý thêm giao thức hoặc tên miền (ví dụ trích dẫn đúng: `[Forum: Xử lý mèo hay cắn](/forum/xu-ly-meo-hay-can)`, không viết là `[Forum: Xử lý mèo hay cắn](https://forum/xu-ly-meo-hay-can)`). Nếu nguồn là forum, hãy nói rõ đó là kinh nghiệm/thảo luận cộng đồng hoặc câu trả lời chuyên gia đã xác minh, không coi là chẩn đoán.\n"
    "- Nếu người dùng yêu cầu trò chuyện với người thật/nhân viên, tỏ ra giận dữ, hoặc khi câu hỏi vượt quá khả năng tư vấn của bạn (ví dụ: khiếu nại đổi trả gay gắt hoặc tình trạng y tế nguy kịch cần cấp cứu): "
    "GỌI tool `request_human_support_tool` để chuyển giao cuộc trò chuyện sang nhân viên hỗ trợ.\n"
    "- Có thể gọi cả hai tool nếu câu hỏi vừa cần kiến thức vừa cần gợi ý sản phẩm.\n"
    "- Sau khi có kết quả tool, trả lời ngắn gọn, có dẫn chứng. Khi muốn giới thiệu sản phẩm, "
    "viết kèm thẻ định dạng `<product>slug-cua-san-pham</product>` ngay trong câu trả lời "
    "(frontend sẽ render thành thẻ sản phẩm). KHÔNG bịa slug — chỉ dùng slug có trong kết quả tool.\n"
    "- Nếu món ăn người dùng hỏi kỵ với dị ứng của thú cưng, hãy cảnh báo rõ ràng.\n\n"
    + DOMAIN_POLICY
)


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]


async def build_knowledge_context(db: AsyncSession, query: str) -> str:
    """Return sanitized RAG context with a stable citation label."""
    from app.services.embeddings import embed_query_cached
    embedding = await embed_query_cached(query)

    # Run searches concurrently in parallel
    results_task = search_knowledge(query=query, limit=3, embedding=embedding)
    forum_results_task = search_forum_discussions(db, query=query, limit=2, embedding=embedding)

    results, forum_results = await asyncio.gather(results_task, forum_results_task)
    results.extend(forum_results)

    if not results:
        return "Không tìm thấy kiến thức liên quan."
    parts = []
    for result in results:
        safe_content = sanitize_retrieved_content(result["content"])
        title = result.get("title") or "Tài liệu nội bộ ThePawsome"
        source_label = "Nguồn forum" if result.get("source_type") == "forum_thread" else "Nguồn"
        if result.get("source_url"):
            source = f"{source_label}: [{title}]({result['source_url']})"
        else:
            source = f"{source_label}: {title}"
        parts.append(
            f"<retrieved_document title={title!r} "
            f"category={result.get('category')!r}>\n"
            f"{safe_content}\n</retrieved_document>\n{source}"
        )
    return "\n\n".join(parts)


def _build_tools(
    db: AsyncSession, user_id: Optional[uuid.UUID], session_id: uuid.UUID, *, allow_cart_mutation: bool = False
):
    @tool
    async def search_products_tool(query: str, species: Optional[List[str]] = None) -> str:
        """Tìm sản phẩm trong cửa hàng ThePawsome bằng từ khóa tìm kiếm.

        Args:
            query: Từ khóa hoặc mô tả sản phẩm cần tìm (ví dụ: 'hạt cho mèo lông dài 5kg').
            species: Lọc theo loài, ví dụ ['cat'] hoặc ['dog']. Bỏ qua nếu không chắc.

        Returns: Danh sách top-5 sản phẩm dạng văn bản, kèm slug để dùng trong thẻ <product>.
        """
        results = await search_products(db, query=query, limit=5, species=species, keyword_only=True)
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
    async def search_knowledge_tool(query: str) -> str:
        """Tìm trong kho kiến thức chăm sóc thú cưng và các thảo luận forum tương tự.

        Args:
            query: Câu hỏi hoặc chủ đề cần tra cứu.

        Returns: Các đoạn kiến thức và thảo luận forum liên quan, kèm tiêu đề bài.
        """
        return await build_knowledge_context(db, query)


    @tool
    async def list_pets_tool() -> str:
        """Liệt kê tất cả thú cưng của người dùng hiện tại (tên, loài, giống, tuổi).

        Dùng khi người dùng nhắc đến thú cưng nhưng chưa rõ đang nói về con nào, hoặc khi
        cần biết người dùng có những thú cưng nào trước khi tư vấn.

        Returns: Danh sách thú cưng dạng văn bản tiếng Việt, kèm id để dùng với get_pet_detail_tool.
        """
        if not user_id:
            return "Bạn chưa đăng nhập, vì vậy không có thông tin thú cưng trong hệ thống."
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
        if not user_id:
            return "Bạn chưa đăng nhập, vì vậy không có thông tin hồ sơ thú cưng."
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

    @tool
    async def request_human_support_tool(reason: str) -> str:
        """Yêu cầu chuyển giao cuộc trò chuyện này cho nhân viên hỗ trợ (người thật).

        Dùng khi người dùng thể hiện mong muốn gặp nhân viên/người thật, hoặc khi câu hỏi vượt quá
        khả năng của bạn (như khiếu nại đổi trả gay gắt hoặc tình huống khẩn cấp cần bác sĩ thực tế).

        Args:
            reason: Lý do cần chuyển giao (ví dụ: 'Khách hàng yêu cầu gặp người thật').

        Returns: Thông báo xác nhận đã chuyển tiếp thành công.
        """
        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.routing_status = ChatRoutingStatusEnum.pending_human
            await db.commit()
            return f"Đã chuyển trạng thái phiên chat sang chờ nhân viên hỗ trợ. Lý do: {reason}."
        return "Không tìm thấy phiên chat tương ứng để chuyển giao."

    tools = [
        search_products_tool,
        search_knowledge_tool,
        list_pets_tool,
        get_pet_detail_tool,
        request_human_support_tool,
    ]
    return tools


def build_agent(
    db: AsyncSession,
    user_id: Optional[uuid.UUID],
    session_id: uuid.UUID,
    *,
    allow_cart_mutation: bool = False,
):
    """Build a per-request StateGraph agent: agent ⇄ tools.

    Graph:
        START → agent → tools_condition ─┬─ tools → agent
                                         └─ END
    """
    llm = ChatOpenAI(
        model=settings.CHAT_MODEL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,
        timeout=settings.AI_REQUEST_TIMEOUT_SECONDS,
        max_retries=settings.AI_MAX_RETRIES,
    )
    tools = _build_tools(
        db, user_id, session_id, allow_cart_mutation=allow_cart_mutation
    )
    llm_with_tools = llm.bind_tools(tools)

    async def agent_node(state: AgentState):
        response = await llm_with_tools.ainvoke(state["messages"])
        return {"messages": [response]}

    async def tools_node(state: AgentState):
        last_message = state["messages"][-1]
        if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
            raise ValueError("No tool calls found in the last message.")
        
        tool_messages = []
        tools_by_name = {t.name: t for t in tools}
        
        for tool_call in last_message.tool_calls:
            name = tool_call["name"]
            tool = tools_by_name[name]
            try:
                output = await tool.ainvoke(tool_call["args"])
                if isinstance(output, ToolMessage):
                    tool_messages.append(output)
                else:
                    tool_messages.append(
                        ToolMessage(
                            content=str(output),
                            tool_call_id=tool_call["id"],
                            name=name
                        )
                    )
            except Exception as e:
                tool_messages.append(
                    ToolMessage(
                        content=f"Error executing tool {name}: {str(e)}",
                        tool_call_id=tool_call["id"],
                        name=name,
                        is_error=True
                    )
                )
        return {"messages": tool_messages}

    workflow = StateGraph(AgentState)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tools_node)
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
