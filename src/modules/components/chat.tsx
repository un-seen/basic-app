import React, { useEffect } from "react";
import '../../css/chat.css';
import { Library, llamaV2Prompt, PromptData } from "hedwigai"

interface ChatProps {
  deactive: boolean;
  library: Library;
}

const ChatUI: React.FC<ChatProps> = (props: ChatProps) => {
  const [chatLoaded, setChatLoaded] = React.useState<boolean>(false);
  const [requestInProgress, setRequestInProgress] = React.useState<boolean>(false);
  const [chatRequestChain, setChatRequestChain] = React.useState<Promise<void>>(
    Promise.resolve(),
  );
  
  const uiChat = React.useRef<HTMLDivElement>(null);
  const [uiChatInput, setUiChatInput] = React.useState<string>("");
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
        .storeFile(file)
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
    console.log(`onGenerate called`)
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
      props.library.interruptGenerateResponse();
    }
    // try reset after previous requests finishes
    pushTask(async () => {
      resetChatHistory();
      await asyncInitChat();
    });
  }, []);

  const onReset = () => {
    if (requestInProgress) {
      // interrupt previous generation if any
      props.library.interruptGenerateResponse();
    }
    // try reset after previous requests finishes
    pushTask(async () => {
      await props.library.resetGenerateResponse(async () => resetChatHistory());
      await props.library.reset()
      
    })
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
    uiChat?.current?.insertAdjacentHTML("beforeend", msg);
    uiChat?.current?.scrollTo(0, uiChat.current.scrollHeight);
  };

  const updateLastMessage = (kind: string, text: string) => {
    if (kind == "init") {
      text = "[System Initalize] " + text;
    }
    const matches = uiChat.current?.getElementsByClassName(`msg ${kind}-msg`);
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
    uiChat.current.scrollTo(0, uiChat.current.scrollHeight);
  };

  const resetChatHistory = () => {
    const clearTags = ["left", "right", "init", "error"];
    for (const tag of clearTags) {
      // need to unpack to list so the iterator don't get affected by mutation
      const matches = [...uiChat.current.getElementsByClassName(`msg ${tag}-msg`)];
      for (const item of matches) {
        uiChat.current.removeChild(item);
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
    console.log(`asyncInitChat called`)
    appendMessage("init", "");
    setRequestInProgress(true);
    try {
      console.log(`loading library runtime`)
      await props.library.reloadRuntime((report) => updateLastMessage("init", report.text));
      console.log(`completed loading library runtime`)
    } catch (err) {
      appendMessage("error", "Init error, " + err.toString());
      console.log(err.stack);
      await props.library.unloadRuntime();
      setRequestInProgress(false);
      return;
    }
    setRequestInProgress(false);
    setChatLoaded(true);
  };

  /**
   * Run generate
   */
  const asyncGenerate = async () => { 
    await asyncInitChat();
    setRequestInProgress(true);
    const prompt = uiChatInput;
    console.log(`asyncGenerate called with prompt: ${prompt}`)
    if (prompt == "" || typeof prompt == "undefined") {
      setRequestInProgress(false);
      return;
    }
    
    setUiChatInput("")
    appendMessage("right", prompt);    

    appendMessage("left", "Thinking...");
    const callbackUpdateResponse = (step, msg) => {
      updateLastMessage("left", msg);
    };

    try {
      console.log(`Requesting generate with prompt: ${prompt}`);
      if (prompt.includes("catalog") && typeof props.library !== "undefined") {
        updateLastMessage("left", "Searching library...");
        const catalog = await props.library.getImage(prompt);
        updateLastMessage(
          "left",
          `Here is the personalized catalog for your prompt.`,
        );
        let ct = 0;
        let program = catalog["system"] || "You are given information about items and you talk about those.";
        for (const item of catalog["response"]) {
          const url = item["image"];
          const text = item["id"];
          appendMessage("left", text, url);
          program += `\n * ${item["caption"]}`;
          ct += 1;
          if (ct > 1) {
            break;
          }
        }
        const systemPrompt: PromptData = {
          role: "system",
          content: program,
        };
        const messages: PromptData[] = [
          {
            role: "user",
            content: "Tell me about the items in the catalog. Keep it succint.",
          },
        ];
        const newPrompt = llamaV2Prompt(systemPrompt, messages);
        appendMessage("left", "Thinking...");
        const output = await props.library.generateResponse(newPrompt, callbackUpdateResponse);
        updateLastMessage("left", output);
      } else if (prompt.includes("seek") && typeof props.library !== "undefined") {
        updateLastMessage("left", "Searching library...");
        const frames = await props.library.seekVideo(prompt);
        updateLastMessage(
          "left",
          `Here is the list of moments in the videos for your prompt.`,
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
      } else if (prompt.includes("?") && typeof props.library !== "undefined") {
        updateLastMessage("left", "Searching library...");
        const conversations = await props.library.getConversation(prompt.replaceAll("?", ""));
        console.log(conversations);
        let augmentedPrompt = "You are a chatterbox, who is fed questions and answers. Then uses it for reference in your conversation."
        let ct = 0;
        for (const item of conversations.response) {
          const question = item["question"];
          const answer = item["answer"];
          const text = `
          question: ${question}
          answer: ${answer}
          `
          appendMessage("left", text);
          augmentedPrompt += `\n * ${text}`;
          ct += 1;
          if (ct > 1) {
            break;
          }
        }
      } else {
        let augmentedPrompt = "You are quiz master, and refers to given sample questions, answers and data.";
        const systemPrompt: PromptData = {
          role: "system",
          content: augmentedPrompt,
        };
        const messages: PromptData[] = [
          {
            role: "user",
            content: prompt,
          },
        ];
        const newPrompt = llamaV2Prompt(systemPrompt, messages);
        const output = await props.library.generateResponse(newPrompt, callbackUpdateResponse);
        updateLastMessage("left", output);
      }
      uiChatInfoLabel.current.innerHTML = await props.library.runtimeStatsText();
    } catch (err) {
      appendMessage("error", "Generate error, " + err.toString());
      console.log(err.stack);
      props.library.unload();
    }
    setRequestInProgress(false);
  };

  return (
    <div className="glass">
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
          value={uiChatInput}
          onChange={(e) => setUiChatInput(e.target.value)}
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
