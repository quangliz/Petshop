from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated, List
import operator

from app.core.config import settings

class AgentState(TypedDict):
    messages: Annotated[List, operator.add]
    pet_context: str

def get_llm():
    return ChatOpenAI(model="gpt-4o-mini", api_key=settings.OPENAI_API_KEY, temperature=0.7)

def chatbot_node(state: AgentState):
    llm = get_llm()
    messages = state["messages"]
    pet_context = state.get("pet_context", "")
    
    sys_prompt = "Bạn là trợ lý AI chuyên gia dinh dưỡng và y tế của PetShop AI. Bạn rất am hiểu về cách chăm sóc thú cưng.\n"
    if pet_context:
        sys_prompt += f"Thông tin thú cưng đang thảo luận:\n{pet_context}\nHãy đưa ra lời khuyên 1 cách cá nhân hoá dựa vào thông tin này. Nếu thức ăn người dùng hỏi mà kỵ với dị ứng của chúng, hãy cản lại.\n"
        
    final_messages = [SystemMessage(content=sys_prompt)] + messages
    response = llm.invoke(final_messages)
    return {"messages": [response]}


def init_chat_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("chatbot", chatbot_node)
    workflow.add_edge(START, "chatbot")
    workflow.add_edge("chatbot", END)
    return workflow.compile()

agent_executor = init_chat_graph()
