// Import internal libraries
// import oxidizer from './oxidizer/Cargo.toml';
import adapterConfig from "./adapter/meta";
import { ChatInterface, ChatModule, ChatWorkerClient } from "@mlc-ai/web-llm";
import { ChatUI } from './adapter/chat';
import * as dotenv from 'dotenv'

dotenv.config();
const useWebWorker = adapterConfig.use_web_worker;
let chat: ChatInterface;

if (useWebWorker) {
  chat = new ChatWorkerClient(new Worker(
    new URL('./adapter/worker.ts', import.meta.url),
    {type: 'module'}
  ));
} else {
  chat = new ChatModule();
}
new ChatUI(chat);

