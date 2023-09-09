import meta from "./meta";
import { ChatInterface, ModelRecord } from "@mlc-ai/web-llm";
import chintanjs, { Library } from 'chintanjs';
import { PromptData, llamaV2Prompt } from "./prompter";
import config from '../config';

function getElementAndCheck(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element == null) {
    throw Error("Cannot find element " + id);
  }
  return element;
}

interface AppConfig {
  model_list: Array<ModelRecord>;
  model_lib_map: Record<string, string>;
}

class ChatUI {
  private uiChat: HTMLElement;
  private uiChatInput: HTMLInputElement;
  private uiChatInfoLabel: HTMLLabelElement;
  private chat: ChatInterface;
  private config: AppConfig = meta;
  private selectedModel: string;
  private chatLoaded = false;
  private requestInProgress = false;
  // We use a request chain to ensure that
  // all requests send to chat are sequentialized
  private chatRequestChain: Promise<void> = Promise.resolve();
  private library: chintanjs.Library;

  constructor(chat: ChatInterface) {
    // use web worker to run chat generation in background
    this.chat = chat;
    this.library = new Library({email: config.email, password: config.password});
    // get the elements
    this.uiChat = getElementAndCheck("chatui-chat");
    this.uiChatInput = getElementAndCheck("chatui-input") as HTMLInputElement;
    this.uiChatInfoLabel = getElementAndCheck("chatui-info-label") as HTMLLabelElement;
    // register event handlers
    getElementAndCheck("chatui-reset-btn").onclick = () => {
      this.onReset();
    };
    const serverHealth = document.getElementById("server-health") as HTMLInputElement;
    serverHealth.onclick = () => {
        this.library.healthCheck().then((res) => {
            if (res['healthy'] === 'yes') {
                serverHealth.innerHTML = 'Server is healthy ✅';
            }
        })
    }

    const fileInput = document.getElementById("chatui-file-input") as HTMLInputElement;
    getElementAndCheck("chatui-upload-btn").onclick = () => {
        fileInput?.click();
    };
    // Listen for changes in the file input
    const ThisUI = this;
    const library = this.library;
    fileInput.addEventListener("change", function () {
        // Display the selected file name
        const files = fileInput.files as FileList;
        for(const file of files) {
            library.storeAsset(file).then((res) => {
                ThisUI.appendMessage("left", res["message"])
                library.indexAsset().then((res) => {
                    ThisUI.appendMessage("left", res["message"])
                }).then(() => {
                    library.listAsset().then((res) => {
                        ThisUI.appendMessage("left", res["response"])
                    })
                })
            })
        }
    });

    getElementAndCheck("signin").onclick = () => {
        this.library.signIn().then(() => {
            getElementAndCheck("signin").innerHTML = "Sign Out";
        })
    }

    getElementAndCheck("chatui-upload-btn").onclick = () => {
        fileInput?.click();
    }

    getElementAndCheck("chatui-send-btn").onclick = () => {
      this.onGenerate();
    };
    // TODO: find other alternative triggers
    getElementAndCheck("chatui-input").onkeypress = (event) => {
      if (event.keyCode === 13) {
        this.onGenerate();
      }
    };

    const modelSelector = getElementAndCheck("chatui-select") as HTMLSelectElement;
    for (let i = 0; i < this.config.model_list.length; ++i) {
      const item = this.config.model_list[i];
      const opt = document.createElement("option");
      opt.value = item.local_id;
      opt.innerHTML = item.local_id;
      opt.selected = (i == 0);
      modelSelector.appendChild(opt);
    }
    this.selectedModel = modelSelector.value;
    modelSelector.onchange = () => {
      this.onSelectChange(modelSelector);
    };
  }
  /**
   * Push a task to the execution queue.
   *
   * @param task The task to be executed;
   */
  private pushTask(task: ()=>Promise<void>) {
    const lastEvent = this.chatRequestChain;
    this.chatRequestChain = lastEvent.then(task);
  }
  // Event handlers
  // all event handler pushes the tasks to a queue
  // that get executed sequentially
  // the tasks previous tasks, which causes them to early stop
  // can be interrupted by chat.interruptGenerate
  private async onGenerate() {
    if (this.requestInProgress) {
      return;
    }
    this.pushTask(async () => {
      await this.asyncGenerate();
    });
  }

  private async onSelectChange(modelSelector: HTMLSelectElement) {
    if (this.requestInProgress) {
      // interrupt previous generation if any
      this.chat.interruptGenerate();
    }
    // try reset after previous requests finishes
    this.pushTask(async () => {
      await this.chat.resetChat();
      this.resetChatHistory();
      await this.unloadChat();
      this.selectedModel = modelSelector.value;
      await this.asyncInitChat();
    });
  }

  private async onReset() {
    if (this.requestInProgress) {
      // interrupt previous generation if any
      this.chat.interruptGenerate();
    }
    // try reset after previous requests finishes
    this.pushTask(async () => {
      await this.chat.resetChat();
      this.resetChatHistory();
    });
  }

  // Internal helper functions
  private appendMessage(kind: string, text: string, image_url=null) {
    if (kind == "init") {
      text = "[System Initalize] " + text;
    }
    if (this.uiChat === undefined) {
      throw Error("cannot find ui chat");
    }
    let msg: string;
    if (image_url !== null) {
      msg = `
        <div class="msg ${kind}-msg">
            <div class="circular-image">
                <img src="data:image/jpeg;base64,${(image_url as string).replace(/^b'|'$/g, '')}" alt="${text}">
            </div>
            <div class="msg-bubble">
                <div class="msg-text">${text}</div>
            </div>
        </div>
      `;
    } else {
      msg = `
        <div class="msg ${kind}-msg">
          <div class="msg-bubble">
            <div class="msg-text">${text}</div>
          </div>
        </div>
      `;
    }
    this.uiChat.insertAdjacentHTML("beforeend", msg);
    this.uiChat.scrollTo(0, this.uiChat.scrollHeight);
  }

  private updateLastMessage(kind, text) {
    if (kind == "init") {
      text = "[System Initalize] " + text;
    }
    if (this.uiChat === undefined) {
      throw Error("cannot find ui chat");
    }
    const matches = this.uiChat.getElementsByClassName(`msg ${kind}-msg`);
    if (matches.length == 0) throw Error(`${kind} message do not exist`);
    const msg = matches[matches.length - 1];
    const msgText = msg.getElementsByClassName("msg-text");
    if (msgText.length != 1) throw Error("Expect msg-text");
    if (msgText[0].innerHTML == text) return;
    const list = text.split('\n').map((t) => {
      const item = document.createElement('div');
      item.textContent = t;
      return item;
    });
    msgText[0].innerHTML = '';
    list.forEach((item) => msgText[0].append(item));
    this.uiChat.scrollTo(0, this.uiChat.scrollHeight);
  }

  private resetChatHistory() {
    const clearTags = ["left", "right", "init", "error"];
    for (const tag of clearTags) {
      // need to unpack to list so the iterator don't get affected by mutation
      const matches = [...this.uiChat.getElementsByClassName(`msg ${tag}-msg`)];
      for (const item of matches) {
        this.uiChat.removeChild(item);
      }
    }
    if (this.uiChatInfoLabel !== undefined) {
      this.uiChatInfoLabel.innerHTML = "";
    }
  }

  private async asyncInitChat() {
    if (this.chatLoaded) return;
    this.requestInProgress = true;
    this.appendMessage("init", "");
    const initProgressCallback = (report) => {
      this.updateLastMessage("init", report.text);
    }
    this.chat.setInitProgressCallback(initProgressCallback);

    try {
      if (this.selectedModel != "Local Server") {
        await this.chat.reload(this.selectedModel, undefined, this.config);
      }
    } catch (err) {
      this.appendMessage("error", "Init error, " + err.toString());
      console.log(err.stack);
      this.unloadChat();
      this.requestInProgress = false;
      return;
    }
    this.requestInProgress = false;
    this.chatLoaded = true;
  }

  private async unloadChat() {
    await this.chat.unload();
    this.chatLoaded = false;
  }

  /**
   * Run generate
   */
  private async asyncGenerate() {
    await this.asyncInitChat();
    this.requestInProgress = true;
    const prompt = this.uiChatInput.value;
    if (prompt == "") {
      this.requestInProgress = false;
      return;
    }

    this.appendMessage("right", prompt);
    this.uiChatInput.value = "";
    this.uiChatInput.setAttribute("placeholder", "Generating...");

    this.appendMessage("left", "Thinking...");
    const callbackUpdateResponse = (step, msg) => {
      this.updateLastMessage("left", msg);
    };

    try {
        console.log(`Requesting generate with prompt: ${prompt}`)
        let retreiving_photos = false
        if (prompt.includes('catalog')) {
            retreiving_photos = true
            this.updateLastMessage("left", "Searching inventory...");
            const catalog = await this.library.fetchCatalog(prompt);
            this.updateLastMessage("left", `Here is the personalized catalog for your prompt.`);
            let ct = 0;
            let augmented_prompt = 'You are an AI sales assistant for a home inventory store company. You know about these pieces of furniture:'
            for (const item of catalog['response']) {
                const url = item['image']
                const text = item['caption']
                this.appendMessage("left", text, url);
                augmented_prompt += `\n * ${text}`
                ct += 1;
                if (ct > 1) {
                    break
                }
            }
            const systemPrompt: PromptData = {
                role: "system",
                content: augmented_prompt
            }
            const messages: PromptData[] = [{
                role: "user",
                content: "Tell me about the items in your inventory"
            }]
            const newPrompt = llamaV2Prompt(systemPrompt, messages);
            console.log(`New prompt: ${newPrompt}`)
            this.appendMessage("left", "Thinking...");
            const output = await this.chat.generate(newPrompt, callbackUpdateResponse);            
            this.updateLastMessage("left", output);
        } else {
            let augmented_prompt = 'You are an AI sales assistant for an executive at a large trading company. You keep your answers short and sweet.'
            const systemPrompt: PromptData = {
                role: "system",
                content: augmented_prompt
            }
            const messages: PromptData[] = [{
                role: "user",
                content: prompt
            }]
            const newPrompt = llamaV2Prompt(systemPrompt, messages);
            const output = await this.chat.generate(newPrompt, callbackUpdateResponse);
            this.updateLastMessage("left", output);
        }        
        this.uiChatInfoLabel.innerHTML = await this.chat.runtimeStatsText();
    } catch (err) {
      this.appendMessage("error", "Generate error, " + err.toString());
      console.log(err.stack);
      await this.unloadChat();
    }
    this.uiChatInput.setAttribute("placeholder", "Enter your message...");
    this.requestInProgress = false;
  }
}

export {
    ChatUI
}