from typing import List, Optional, Annotated, TypedDict
import operator

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, START
from langgraph.prebuilt import ToolNode, tools_condition
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.retrieval import search_products, search_knowledge


SYSTEM_PROMPT_BASE = (
    "Bạn là Catbot 🐱 — trợ lý AI chuyên gia dinh dưỡng và y tế của ThePawsome. "
    "Bạn rất am hiểu cách chăm sóc thú cưng và luôn trả lời bằng tiếng Việt.\n\n"
    "Quy tắc sử dụng công cụ:\n"
    "- Khi người dùng hỏi về sản phẩm, gợi ý mua hàng, hoặc cần tìm thức ăn/đồ dùng cụ thể: "
    "GỌI tool `search_products` để tìm sản phẩm trong cửa hàng.\n"
    "- Khi người dùng hỏi về dinh dưỡng, sức khỏe, huấn luyện, grooming, đặc điểm giống loài: "
    "GỌI tool `search_knowledge` để tra cứu kho kiến thức trước khi trả lời.\n"
    "- Khi trả lời dựa trên kết quả `search_knowledge`, hãy trích dẫn tên bài và link Nguồn nếu có.\n"
    "- Có thể gọi cả hai tool nếu câu hỏi vừa cần kiến thức vừa cần gợi ý sản phẩm.\n"
    "- Sau khi có kết quả tool, trả lời ngắn gọn, có dẫn chứng. Khi muốn giới thiệu sản phẩm, "
    "viết kèm thẻ định dạng `<product>slug-cua-san-pham</product>` ngay trong câu trả lời "
    "(frontend sẽ render thành thẻ sản phẩm). KHÔNG bịa slug — chỉ dùng slug có trong kết quả tool.\n"
    "- Nếu món ăn người dùng hỏi kỵ với dị ứng của thú cưng, hãy cảnh báo rõ ràng.\n"
)


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]


def _build_tools(db: AsyncSession):
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

    return [search_products_tool, search_knowledge_tool]


def build_agent(db: AsyncSession):
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
    tools = _build_tools(db)
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
