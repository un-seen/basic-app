export default {
	"model_list": [
		{
			"model_url": "https://huggingface.co/mlc-ai/mlc-chat-Llama-2-7b-chat-hf-q4f32_1/resolve/main/",
			"local_id": "Llama2-7b-f32"
		},
		{
			"model_url": "https://huggingface.co/mlc-ai/mlc-chat-Llama-2-13b-chat-hf-q4f32_1/resolve/main/",
			"local_id": "Llama2-13b-f32"
		},
		{
			"model_url": "https://huggingface.co/mlc-ai/mlc-chat-Llama-2-7b-chat-hf-q4f16_1/resolve/main/",
			"local_id": "Llama2-7b-f16",
			"required_features": ["shader-f16"],
		},
		{
			"model_url": "https://huggingface.co/mlc-ai/mlc-chat-Llama-2-13b-chat-hf-q4f16_1/resolve/main/",
			"local_id": "Llama-2-13b-f16",
			"required_features": ["shader-f16"],
		},
		{
			"model_url": "https://huggingface.co/mlc-ai/mlc-chat-Llama-2-70b-chat-hf-q4f16_1/resolve/main/",
			"local_id": "Llama2-70b-f16",
			"required_features": ["shader-f16"],
		}
	],
	"model_lib_map": {
		"Llama-2-7b-chat-hf-q4f32_1": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Llama-2-7b-chat-hf-q4f32_1-webgpu.wasm",
		"Llama-2-13b-chat-hf-q4f32_1": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Llama-2-13b-chat-hf-q4f32_1-webgpu.wasm",
		"Llama-2-7b-chat-hf-q4f16_1": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Llama-2-7b-chat-hf-q4f16_1-webgpu.wasm",
		"Llama-2-13b-chat-hf-q4f16_1": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Llama-2-13b-chat-hf-q4f16_1-webgpu.wasm",
		"Llama-2-70b-chat-hf-q4f16_1": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Llama-2-70b-chat-hf-q4f16_1-webgpu.wasm",
	},
	"use_web_worker": true
}