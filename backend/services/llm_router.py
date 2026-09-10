"""
LLM router: get_llm(mode) switches between Gemini API, Claude API, and local Ollama/Qwen3.
"""

from langchain_core.language_models.chat_models import BaseChatModel
try:
    from core.config import settings
except ImportError:
    from backend.core.config import settings  # type: ignore[import-not-found]


def get_llm(mode: str | None = None) -> BaseChatModel:
    """
    Return an LLM client based on mode / provider.

    Parameters
    ----------
    mode : str, optional
        "gemini", "anthropic", "cloud", or "local" (Ollama/Qwen3).
        Defaults to settings.LLM_PROVIDER or settings.LLM_MODE.
    """
    target = (mode or settings.LLM_PROVIDER or settings.LLM_MODE).lower()
    
    if target in ("local", "ollama"):
        from langchain_community.chat_models import ChatOllama
        return ChatOllama(model="qwen3:14b", base_url=settings.OLLAMA_BASE_URL, temperature=0)
    elif target in ("anthropic", "claude"):
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(  # type: ignore[call-arg]
            model="claude-3-opus-20240229",  # type: ignore[call-arg]
            api_key=settings.ANTHROPIC_API_KEY,  # type: ignore[arg-type]
            temperature=0,
        )
    else:
        # Default to Gemini (cloud mode)
        if settings.GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0,
            )
        elif settings.ANTHROPIC_API_KEY:
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(  # type: ignore[call-arg]
                model="claude-3-opus-20240229",  # type: ignore[call-arg]
                api_key=settings.ANTHROPIC_API_KEY,  # type: ignore[arg-type]
                temperature=0,
            )
        else:
            from langchain_google_genai import ChatGoogleGenerativeAI
            return ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0,
            )
