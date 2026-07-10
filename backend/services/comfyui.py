import asyncio
import httpx
import json
import uuid
from typing import Optional
from config import COMFYUI_URL


class ComfyUIService:
    def __init__(self):
        self.base_url = COMFYUI_URL
        self.client = httpx.AsyncClient(timeout=300.0)

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 1024,
        height: int = 1024,
        model: str = "",
    ) -> Optional[str]:
        try:
            workflow = self._build_workflow(prompt, negative_prompt, width, height, model)
            resp = await self.client.post(
                f"{self.base_url}/prompt",
                json={"prompt": workflow, "client_id": str(uuid.uuid4())},
            )
            resp.raise_for_status()
            data = resp.json()
            prompt_id = data.get("prompt_id")
            if not prompt_id:
                return None
            return await self._poll_for_result(prompt_id)
        except Exception as e:
            return None

    async def _poll_for_result(self, prompt_id: str, max_attempts: int = 120) -> Optional[str]:
        for _ in range(max_attempts):
            try:
                resp = await self.client.get(f"{self.base_url}/history/{prompt_id}")
                if resp.status_code == 200:
                    history = resp.json()
                    if prompt_id in history:
                        outputs = history[prompt_id].get("outputs", {})
                        for node_id, node_output in outputs.items():
                            images = node_output.get("images", [])
                            if images:
                                return images[0].get("filename")
            except Exception:
                pass
            await asyncio.sleep(1)
        return None

    def _build_workflow(self, prompt: str, negative_prompt: str, width: int, height: int, model: str):
        return {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": 42,
                    "steps": 20,
                    "cfg": 7,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0],
                },
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": model if model else "model.safetensors"},
            },
            "5": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": width, "height": height, "batch_size": 1},
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": prompt, "clip": ["4", 1]},
            },
            "7": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": negative_prompt, "clip": ["4", 1]},
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": {"filename_prefix": "localgpt", "images": ["8", 0]},
            },
        }

    async def close(self):
        await self.client.aclose()
