import React, { useEffect } from "react";
import '../../css/chat.css';
import { Library, PromptData } from "hedwigai"


interface ChatProps {
  deactive: boolean;
  library: Library;
}

function getRandomEmoji(): string {
  const emojis = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
    "🙂", "🙃", "😉", "😎", "🤩", "😍", "😘", "😗", "😙", "😚",
    "☺️", "🤗", "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😣",
    "😥", "😮", "🤐", "😯", "😪", "😫", "😴", "😌", "😛", "😜",
    "😝", "🤤", "😒", "😓", "😔", "😕", "🙁", "😖", "😞", "😟",
    "😤", "😢", "😭", "😦", "😧", "😨", "😩", "🤯", "😬", "😰",
    "😱", "🥵", "🥶", "😳", "🤪", "😵", "😡", "😠", "🤬", "😷",
    "🤒", "🤕", "🤢", "🤮", "🤧", "😇", "🤠", "🤡", "🥳", "🥴",
    "🥺", "🤥", "🤫", "🤭", "🧐", "🤓", "😈", "👿", "👹", "👺",
    "💀", "👻", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻",
    "😼", "😽", "🙀", "😿", "😾", "👶", "👦", "👧", "👨", "👩",
    "👴", "👵", "👮", "👷", "💂", "🕵️", "👯", "💃", "🕺", "👫",
    "👬", "👭", "💏", "💑", "👪", "👤", "👥"
  ];

  const randomIndex = Math.floor(Math.random() * emojis.length);
  return emojis[randomIndex];
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
      if (typeof props.library === "undefined") return;
      props.library
        .indexFile(file)
        .then((result) => {
          queueMessage("left", result["message"]);
        })
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
      // props.library.interruptGenerateResponse();
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
      // props.library.interruptGenerateResponse();
    }
    // try reset after previous requests finishes
    pushTask(async () => {
      // await props.library.resetGenerateResponse(async () => resetChatHistory());
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

  const asyncInitChat = async (): Promise<void> => {
    if (chatLoaded) {
      return
    };
    setRequestInProgress(true);
    try {
      const messages: PromptData[] = [{
        "content": `Hi! I am here to chat to talk about the knowledge graph.`,
        "role": "user"
      }]
      const result = await props.library.generateResponse(messages)
      appendMessage("left", result["response"])
      appendMessage("left", "Please give a prompt with keyword \n [1] `catalog` for images \n  [2] `seek` for videos \n  [3] `?` for conversation");
      setRequestInProgress(false);
      setChatLoaded(true);
    } catch (err) {
      appendMessage("error", "Init error, " + err.toString());
      console.log(err.stack);
      setRequestInProgress(false);
    }
  };

  /**
   * Run generate
   */
  const asyncGenerate = async () => { 
    await asyncInitChat();
    setRequestInProgress(true);
    const prompt = uiChatInput;
    if (prompt == "" || typeof prompt == "undefined") {
      setRequestInProgress(false);
      return;
    }
    
    setUiChatInput("")
    appendMessage("right", prompt);    

    try {
      if (prompt.includes("catalog") && typeof props.library !== "undefined") {
        appendMessage("left", "Searching library...");
        const catalog = await props.library.findImage(prompt);
        catalog['response'] = JSON.parse(catalog['response']);
        updateLastMessage("left", `Here is the personalized catalog for your prompt.`);
        let ct = 0;
        let program = catalog["system"] || "You are given information about items and you talk about those.";
        for (const item of catalog["response"]) {
          const url = item["image"];
          let text = "";
          for (const key in item) {
            if (['image', 'caption', 'dist'].includes(key)) continue;
            if (key == 'id') {
              text += `This file has name ${item[key]} <br/>`
            } else {
              text += `➕ ${key} => ${item[key]} <br/>`;
            }
          }
          appendMessage("left", text, url);
          program += `\n * ${item["caption"]}`;
          ct += 1;
          if (ct > 4) {
            break;
          }
        }
      } else if (prompt.includes("seek") && typeof props.library !== "undefined") {
        appendMessage("left", "Searching library...");
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
        appendMessage("left", "Searching library...");
        const conversations = await props.library.findConversation(prompt.replaceAll("?", ""));
        let augmentedPrompt = "You are a chatterbox, who is fed questions and answers. Then uses it for reference in your conversation."
        let ct = 0;
        for (const item of conversations.response) {
          const question = item["question"];
          const answer = item["answer"];
          const text = `
          question: ${question}
          answer: ${answer}`
          appendMessage("left", text);
          augmentedPrompt += `\n * ${text}`;
          ct += 1;
          if (ct > 1) {
            break;
          }
        }
      } else {
        appendMessage("left", "Thinking...")
        const messages: PromptData[] = [{
          "content": prompt,
          "role": "user"
        }]
        const result = await props.library.generateResponse(messages)
        updateLastMessage("left", result["response"])
        appendMessage("left", "Please give a prompt with \n [1] catalog for images \n  [2] seek for videos \n  [3] ? for conversation");
      }
      uiChatInfoLabel.current.innerHTML = await props.library.runtimeStatsText();
    } catch (err) {
      appendMessage("error", "Generate error, " + err.toString());
      console.log(err.stack);
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
