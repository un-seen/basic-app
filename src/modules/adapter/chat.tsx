import meta from "./meta";
import { ChatInterface, ModelRecord } from "@mlc-ai/web-llm";
import { PromptData, llamaV2Prompt } from "./prompter";
import React, { useEffect } from "react";
import '../../css/chat.css';
import { Library } from "hedwigai"

interface ModelConfig {
  model_list: Array<ModelRecord>;
  model_lib_map: Record<string, string>;
}

interface ChatProps {
  chatInterface: ChatInterface;
  deactive: boolean;
  library: Library;
}

const ChatUI: React.FC<ChatProps> = (props: ChatProps) => {
  const [chatLoaded, setChatLoaded] = React.useState<boolean>(false);
  const [requestInProgress, setRequestInProgress] =
    React.useState<boolean>(false);
  const [selectedModel, setSelectedModel] = React.useState<string>(
    meta.default_model,
  );
  const [chatRequestChain, setChatRequestChain] = React.useState<Promise<void>>(
    Promise.resolve(),
  );
  
  const uiChat = React.useRef<HTMLDivElement>(null);
  const uiChatInput = React.useRef<HTMLInputElement>(null);
  const uiChatInfoLabel = React.useRef<HTMLLabelElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  
  const queueMessage = (alignment: "left" | "right", message: string) => {
    appendMessage(alignment, message);
  };

  const changeFileInput = () => {
    // Display the selected file name
    if (fileInput.current.files.length === 0) {
      queueMessage("left", "No file selected");
    } else {
      const file = fileInput.current.files[0] as File;
      console.log(file.name);
      if (typeof props.library === "undefined") return;
      props.library
        .storeAsset(file)
        .then((result) => {
          queueMessage("left", result["message"]);
        })
        .then(() => {
          props.library.listAsset().then((res) => {
            queueMessage(
              "left",
              `Here are the files in your library: \n *${res.join("\n * ")}`,
            );
          });
        });
    }
  };

  const registerEnterKeyOnUIChatInput = (event) => {
    if (event.keyCode === 13) {
      onGenerate();
    }
  };

  /**
   * Push a task to the execution queue.
   *
   * @param task The task to be executed;
   */
  const pushTask = (task: () => Promise<void>) => {
    const lastEvent = chatRequestChain;
    setChatRequestChain(lastEvent.then(task));
  };

  // Event handlers
  // all event handler pushes the tasks to a queue
  // that get executed sequentially
  // the tasks previous tasks, which causes them to early stop
  // can be interrupted by chat.interruptGenerate
  const onGenerate = () => {
    console.log(`onGenerate called ${requestInProgress}`)
    if (requestInProgress) {
      return;
    }
    pushTask(async () => {
      await asyncGenerate();
    });
  };

  useEffect(() => {
    if (requestInProgress) {
      // interrupt previous generation if any
      props.chatInterface.interruptGenerate();
    }
    // try reset after previous requests finishes
    pushTask(async () => {
      await props.chatInterface.resetChat();
      resetChatHistory();
      await asyncUnloadChat();
      await asyncInitChat();
    });
  }, [selectedModel]);

  const onReset = () => {
    if (requestInProgress) {
      // interrupt previous generation if any
      props.chatInterface.interruptGenerate();
    }
    // try reset after previous requests finishes
    pushTask(async () => {
      await props.chatInterface.resetChat();
      resetChatHistory();
    });
  };

  // Internal helper functions
  const appendMessage = (
    kind: string,
    text: string,
    image_url: string | null = null,
    video_url: string | null = null,
  ) => {
    if (kind == "init") {
      text = "[System Initalize] " + text;
    }

    let msg: string;
    if (image_url !== null) {
      msg = `
        <div class="msg ${kind}-msg">
          <div class="msg-bubble">
            <div class="msg-text">${text}</div>
            <div class="circular-image">
                <img src="data:image/jpeg;base64,${(
                  image_url as string
                ).replace(/^b'|'$/g, "")}" alt="${text}">
            </div>
          </div>
        </div>
      `;
      console.log(msg);
    } else if (video_url !== null) {
      msg = `
        <div class="msg ${kind}-msg">
            <div class="msg-bubble">
                <div class="msg-text">${text}</div>
                ${
                  video_url !== null
                    ? `<video width="320" height="240" controls> <source src="${video_url}" type="video/mp4"> </video>`
                    : ""
                }
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
    uiChat?.current.insertAdjacentHTML("beforeend", msg);
    uiChat?.current.scrollTo(0, uiChat.current.scrollHeight);
  };

  const updateLastMessage = (kind: string, text: string) => {
    if (kind == "init") {
      text = "[System Initalize] " + text;
    }
    const matches = uiChat?.current.getElementsByClassName(`msg ${kind}-msg`);
    if (typeof matches == "undefined" || matches?.length == 0)
      throw Error(`${kind} message do not exist`);
    const msg = matches[matches.length - 1];
    const msgText = msg.getElementsByClassName("msg-text");
    if (msgText.length != 1) throw Error("Expect msg-text");
    if (msgText[0].innerHTML == text) return;
    const list: HTMLDivElement[] = text.split("\n").map((t: string) => {
      const item = document.createElement("div");
      item.textContent = t;
      return item;
    });
    msgText[0].innerHTML = "";
    list.forEach((item) => msgText[0].append(item));
    uiChat?.current.scrollTo(0, uiChat?.current.scrollHeight);
  };

  const resetChatHistory = () => {
    const clearTags = ["left", "right", "init", "error"];
    for (const tag of clearTags) {
      // need to unpack to list so the iterator don't get affected by mutation
      const matches = [...uiChat.current.getElementsByClassName(`msg ${tag}-msg`)];
      for (const item of matches) {
        uiChat?.current.removeChild(item);
      }
    }
    if (uiChatInfoLabel.current !== null) {
      uiChatInfoLabel.current.innerHTML = "";
    }
  };

  const asyncInitChat = async () => {
    if (chatLoaded) {
      console.log("chat already loaded")
      return
    };
    console.log("loading chat")
    setRequestInProgress(true);
    appendMessage("init", "");
    const initProgressCallback = (report) => {
      updateLastMessage("init", report.text);
    };
    props.chatInterface.setInitProgressCallback(initProgressCallback);

    try {
      await props.chatInterface.reload(selectedModel, undefined, meta);
    } catch (err) {
      appendMessage("error", "Init error, " + err.toString());
      console.log(err.stack);
      await asyncUnloadChat();
      setRequestInProgress(false);
      return;
    }
    setRequestInProgress(false);
    setChatLoaded(true);
  };

  const asyncUnloadChat = async () => {
    await props.chatInterface.unload();
    setChatLoaded(false);
  };

  /**
   * Run generate
   */
  const asyncGenerate = async () => {
    await asyncInitChat();
    setRequestInProgress(true);
    const prompt = uiChatInput?.current.value;
    if (prompt == "" || typeof prompt == "undefined") {
      setRequestInProgress(false);
      return;
    }

    appendMessage("right", prompt);
    uiChatInput?.current.value = "";
    uiChatInput?.current.setAttribute("placeholder", "Generating...");

    appendMessage("left", "Thinking...");
    const callbackUpdateResponse = (step, msg) => {
      updateLastMessage("left", msg);
    };

    try {
      console.log(`Requesting generate with prompt: ${prompt}`);
      if (prompt.includes("catalog") && typeof props.library !== "undefined") {
        updateLastMessage("left", "Searching library...");
        const catalog = await props.library.fetchCatalog(prompt);
        updateLastMessage(
          "left",
          `Here is the personalized catalog for your prompt.`,
        );
        let ct = 0;
        let augmented_prompt =
          "You are a movie curator, and talks about movies with your friends.";
        console.log(catalog);
        for (const item of catalog["response"]) {
          const url = item["image"];
          const text = item["id"];
          appendMessage("left", text, url);
          augmented_prompt += `\n * ${item["caption"]}`;
          ct += 1;
          if (ct > 1) {
            break;
          }
        }
        const systemPrompt: PromptData = {
          role: "system",
          content: augmented_prompt,
        };
        const messages: PromptData[] = [
          {
            role: "user",
            content: "Tell me about the items in your inventory",
          },
        ];
        const newPrompt = llamaV2Prompt(systemPrompt, messages);
        console.log(`New prompt: ${newPrompt}`);
        appendMessage("left", "Thinking...");
        const output = await props.chatInterface.generate(newPrompt, callbackUpdateResponse);
        updateLastMessage("left", output);
      } else if (prompt.includes("seek") && typeof props.library !== "undefined") {
        updateLastMessage("left", "Searching library...");
        const frames = await props.library.seekVideo(prompt);
        updateLastMessage(
          "left",
          `In these videos we found what you are seeking in your prompt.`,
        );
        let ct = 0;
        const videos: { [key: string]: string } = {};
        for (const item of frames["response"]) {
          const path = item["path"];
          const url = item["url"];
          const timestamp = item["timestamp"];
          const frame = item["frame"];
          const message = `\n In the video ${path} at frame ${timestamp}`;
          appendMessage("left", message, frame);
          videos[path] = url;
          ct += 1;
          if (ct > 1) {
            break;
          }
        }
        appendMessage("left", `\n You can watch the videos here:`);
        for (const key of Object.keys(videos)) {
          appendMessage("left", key, null, videos[key]);
        }
      } else if (prompt.includes("answer") && typeof props.library !== "undefined") {
        updateLastMessage("left", "Searching library...");
        const answer = await props.library.informUser(prompt);
        updateLastMessage("left", `Here is the answer to your question.`);
        appendMessage("left", answer["response"]);
      } else {
        let augmented_prompt =
          "You are a movie curator, and talks about movies with your friends.";
        const systemPrompt: PromptData = {
          role: "system",
          content: augmented_prompt,
        };
        const messages: PromptData[] = [
          {
            role: "user",
            content: prompt,
          },
        ];
        const newPrompt = llamaV2Prompt(systemPrompt, messages);
        const output = await props.chatInterface.generate(newPrompt, callbackUpdateResponse);
        updateLastMessage("left", output);
      }
      uiChatInfoLabel.current.innerHTML = await props.chatInterface.runtimeStatsText();
    } catch (err) {
      appendMessage("error", "Generate error, " + err.toString());
      console.log(err.stack);
      await asyncUnloadChat();
    }
    uiChatInput.current.setAttribute("placeholder", "Enter your message...");
    setRequestInProgress(false);
  };

  return (
    <div className="chatui">
      <div
        className="chatui-chat"
        id="chatui-chat"
        style={{ height: "100" }}
        ref={uiChat}
      ></div>
      <div className="chatui-inputarea">
        <input
          id="chatui-input"
          type="text"
          className="chatui-input"
          ref={uiChatInput}
          placeholder="Enter your message..."
          onKeyDown={registerEnterKeyOnUIChatInput}
        />
        <button
          id="chatui-send-btn"
          className="chatui-send-btn"
          onClick={onGenerate}
        >
          Send
        </button>
        <button id="chatui-reset-btn" className="chatui-btn" onClick={onReset}>
          Reset 🎬
        </button>
        <input
          type="file"
          id="chatui-file-input"
          style={{ display: "none" }}
          ref={fileInput}
          onChange={changeFileInput}
        />
        <button
          id="chatui-upload-btn"
          className="chatui-btn"
          onClick={() => fileInput.current.click()}
        >
          Add 📚
        </button>
      </div>
      <div className="chatui-extra-control">
        <label id="chatui-info-label" ref={uiChatInfoLabel}></label>
      </div>
    </div>
  );
};

export { ChatUI };
