import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import asc
from database import get_db
from models.chat import Chat
from models.message import Message
from models.collection import Collection
from services.chroma_service import ChromaService
from services.providers.registry import ProviderRegistry
from utils.helpers import log_api_call
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/chats", tags=["Messages"])
chroma = ChromaService()


class MessageSend(BaseModel):
    content: str
    model: str = ""
    provider: str = ""
    temperature: float = 0.7
    top_p: float = 0.95
    max_tokens: int = 4096
    stream: bool = False
    image_url: Optional[str] = None
    use_rag: bool = False


def resolve_provider(model: str, provider_name: str = ""):
    if provider_name:
        p = ProviderRegistry.get_provider(provider_name)
        if p:
            return p
    p = ProviderRegistry.get_provider_for_model(model)
    if p:
        return p
    p = ProviderRegistry.get_provider("lm_studio")
    if p:
        return p
    providers = ProviderRegistry.get_all_providers()
    if providers:
        return list(providers.values())[0]
    return None


@router.get("/{chat_id}/messages")
def list_messages(chat_id: int, db: Session = Depends(get_db)):
    messages = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(asc(Message.created_at))
        .all()
    )
    return {"messages": messages}


@router.post("/{chat_id}/messages")
async def send_message(chat_id: int, data: MessageSend, db: Session = Depends(get_db)):
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(404, "Chat not found")

    user_msg = Message(chat_id=chat_id, role="user", content=data.content, image_url=data.image_url)
    db.add(user_msg)
    db.commit()

    rag_context = ""
    if data.use_rag:
        collection_id = chat.collection_id
        if not collection_id:
            collections = chroma.list_collections()
            if collections:
                collection_id = collections[0].id

        if collection_id:
            collection = db.query(Collection).filter(Collection.id == collection_id).first()
            if collection:
                results = chroma.search(collection.name, data.content)
                if results:
                    rag_context = "\n\nContext from knowledge base:\n" + "\n".join(
                        [r["document"] for r in results]
                    )

    messages_for_llm = []
    if chat.system_prompt:
        messages_for_llm.append({"role": "system", "content": chat.system_prompt})
    if rag_context:
        messages_for_llm.append({"role": "system", "content": rag_context})

    prev_messages = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(asc(Message.created_at))
        .limit(20)
        .all()
    )
    for m in prev_messages:
        msg = {"role": m.role, "content": m.content}
        if m.image_url:
            msg["images"] = [m.image_url]
        messages_for_llm.append(msg)

    model = data.model or chat.model or ""
    provider_name = data.provider or ""
    provider = resolve_provider(model, provider_name)
    if not provider:
        return {"error": "No AI provider available. Please configure a provider in Settings."}

    if data.stream:
        async def generate():
            full_content = ""
            async for chunk in provider.chat_completions_stream(
                messages=messages_for_llm,
                model=model,
                temperature=data.temperature,
                top_p=data.top_p,
                max_tokens=data.max_tokens,
            ):
                full_content += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"

            assistant_msg = Message(chat_id=chat_id, role="assistant", content=full_content)
            db.add(assistant_msg)
            db.commit()

            if chat.title == "New Chat":
                chat.title = data.content[:50]
                db.commit()

        return StreamingResponse(generate(), media_type="text/event-stream")

    result = await provider.chat_completions(
        messages=messages_for_llm,
        model=model,
        temperature=data.temperature,
        top_p=data.top_p,
        max_tokens=data.max_tokens,
    )

    if result.get("error"):
        return {"error": result["message"]}

    content = result["choices"][0]["message"]["content"]
    assistant_msg = Message(chat_id=chat_id, role="assistant", content=content)
    db.add(assistant_msg)
    db.commit()

    if chat.title == "New Chat":
        chat.title = data.content[:50]
        db.commit()

    tokens = result.get("usage", {}).get("total_tokens", 0) or result.get("usage", {}).get("input_tokens", 0) + result.get("usage", {}).get("output_tokens", 0)
    log_api_call("/chat/completions", "POST", 200, tokens)

    return {
        "message": {
            "id": assistant_msg.id,
            "role": "assistant",
            "content": content,
        }
    }


@router.delete("/{chat_id}/messages/{message_id}")
def delete_message(chat_id: int, message_id: int, db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id, Message.chat_id == chat_id).first()
    if not msg:
        raise HTTPException(404, "Message not found")
    db.delete(msg)
    db.commit()
    return {"ok": True}
