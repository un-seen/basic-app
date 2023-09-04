// Import internal libraries
// import oxidizer from './oxidizer/Cargo.toml';
import adapterConfig from "./adapter/meta";
import { ChatInterface, ChatModule, ChatRestModule, ChatWorkerClient, ModelRecord } from "@mlc-ai/web-llm";
import { ChatUI } from './adapter/chat';

const useWebWorker = adapterConfig.use_web_worker;
let chat: ChatInterface;
let localChat: ChatInterface;

if (useWebWorker) {
  chat = new ChatWorkerClient(new Worker(
    new URL('./adapter/worker.ts', import.meta.url),
    {type: 'module'}
  ));
  localChat = new ChatRestModule();
} else {
  chat = new ChatModule();
  localChat = new ChatRestModule();
}
new ChatUI(chat, localChat);

