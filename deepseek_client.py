"""Small DeepSeek JSON client for the standalone Python evaluation scripts."""

import json
import os
from urllib.request import Request, urlopen


DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_MODEL = "deepseek-v4-flash"


def deepseek_chat_json(system_prompt: str, user_content: str, max_tokens: int) -> str:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY not found. Add it to .env in this directory.")

    payload = json.dumps({
        "model": DEEPSEEK_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": max_tokens,
        "temperature": 0,
    }).encode("utf-8")
    request = Request(
        DEEPSEEK_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urlopen(request, timeout=90) as response:
        result = json.load(response)
    return result["choices"][0]["message"].get("content") or "{}"
