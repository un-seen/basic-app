import React, { useEffect } from "react";
import '../../css/chat.css';
import '../../css/terminal.css';
import { Library, PromptData } from "hedwigai"
import { convertSeconds, getRandomId } from "./math";

interface ChatProps {
  disabled: boolean;
  library: Library;
}

const ChatUI: React.FC<ChatProps> = (props: ChatProps) => {
  const [requestInProgress, setRequestInProgress] = React.useState<boolean>(false);
  const [chatRequestChain, setChatRequestChain] = React.useState<Promise<void>>(
    Promise.resolve(),
  );
  const [triggerDialog, setTriggerDialog] = React.useState<string>("");
  const [queuedChat, setQueuedChat] = React.useState<(() => void)[]>([]);
  const uiChat = React.useRef<HTMLDivElement>(null);
  const [uiChatInput, setUiChatInput] = React.useState<string>("");
  const fileInput = React.useRef<HTMLInputElement>(null);
  
  const queueMessage = (replace: boolean, alignment: "left" | "right", text: string, image_url: string | null = null, video_url: string | null = null) => {
    setQueuedChat([...queuedChat, () => replace ? updateLastMessage(alignment, text) : appendMessage(alignment, text, image_url, video_url)])
    setTimeout(() => setTriggerDialog(text), 1000);
  };

  useEffect(() => {
    // if (chatLoaded) return;
    appendMessage("left", "Please give a prompt with keyword  \n [1] `catalog` for images \n  [2] `seek` for videos \n  [3] `?` for conversation");

    () => {
      uiChat.current?.childNodes.forEach((node) => {
        node.remove();
      })
    }
  }, [])

  const changeFileInput = () => {
    // Display the selected file name
    if (fileInput.current.files.length === 0) {
      queueMessage(false, "left", "No file selected");
    } else {
      const file = fileInput.current.files[0] as File;
      if (typeof props.library === "undefined") return;
      props.library
        .indexFile(file)
        .then((result) => {
          queueMessage(false, "left", `${file.name} Uploaded ✅`);
          setTriggerDialog(`file_uploaded ${file.name}`);
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
    if (queuedChat.length > 0) {
      const task = queuedChat[0];
      setRequestInProgress(true);
      task()
      setRequestInProgress(false);  
      setQueuedChat(queuedChat.slice(1));
    }
  }, [triggerDialog]);

  // Internal helper functions
  const appendMessage = (
    kind: string,
    text: string,
    image_url: string | null = null,
    video_url: string | null = null
  ) => {
    let msg: string;
    let randomId = getRandomId();
    let textLength = 0
    function typeCharacter() {
      uiChat?.current?.scrollTo(0, uiChat.current.scrollHeight)
      let textChar = text.charAt(textLength++);
      let paragraph = document.getElementById(randomId);
      let charElement = document.createTextNode(textChar);
      paragraph.appendChild(charElement);
      if(textLength < text.length+1) {
          setTimeout(() => typeCharacter(), 10);
      } else {
          document.getElementById(randomId)?.classList.replace("typed", "typed-complete")
          text = '';
          setTriggerDialog(randomId)
      }
  }
    if (image_url !== null) {
      msg = `
        <div class="msg ${kind}-msg">
          <div class="msg-bubble">
            <div id=${randomId} class="msg-text typed"></div>
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
                <div id=${randomId} class="msg-text typed"></div>
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
            <div id=${randomId} class="msg-text typed"></div>
          </div>
        </div>
      `;
    }
    uiChat?.current?.insertAdjacentHTML("beforeend", msg);
    typeCharacter();
  };

  const updateLastMessage = (kind: string, text: string) => {
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
    // uiChat.current.scrollTo(0, uiChat.current.scrollHeight);
  };

  /**
   * Run generate
   */
  const asyncGenerate = async () => { 
    const prompt = uiChatInput;
    if (prompt == "" || typeof prompt == "undefined") {
      return;
    }
    
    setUiChatInput("")

    try {
      if (prompt.includes("catalog") && typeof props.library !== "undefined") {
        appendMessage("right", prompt);    
        queueMessage(false, "left", "Searching library...");
        let sanitized_prompt = prompt.replace("catalog", "").trim();
        const catalog = await props.library.findImage(sanitized_prompt, 50);
        
        queueMessage(true, "left", `Here is the personalized catalog for your prompt.`);
        catalog['response'] = JSON.parse(catalog['response']);
        for (const item of catalog["response"]) {
          const url = item["image"];
          let caption = item["caption"];
          caption = caption.charAt(0).toUpperCase() + caption.substr(1).toLowerCase()
          let text = `This file with name ${item['id']}. ${caption}`;
          queueMessage(false, "left", text, url);
          setTriggerDialog(caption + "T");
        }
      } else if (prompt.includes("seek") && typeof props.library !== "undefined") {
        let query = prompt.replaceAll("seek", "");
        if(query.length == 0) {
          return
        }
        appendMessage("right", prompt);    
        queueMessage(false, "left", "Searching library...");
        const frames = await props.library.findVideo(query, 50);
        
        queueMessage(
          true,
          "left",
          `Here is the list of moments in the videos for your prompt.`
        );
        setTriggerDialog("seek");
        let ct = 0;
        for (const item of frames["response"]) {
          const path = item["path"];
          const timestamp = item["timestamp"];
          const frame = item["frame"];
          const message = `\n In the video ${path} at ${convertSeconds(timestamp)}. ${item['caption']}`;
          setTriggerDialog(timestamp);
          queueMessage(false, "left", message, frame);
          setTriggerDialog(timestamp + "T");
        }
      } else {
        appendMessage("right", prompt);    
        queueMessage(false, "left", "Thinking...")
        const messages: PromptData[] = [{
          "content": prompt,
          "role": "user"
        }]
        const result = await props.library.generate(messages)
        queueMessage(true, "left", result["response"], true)
        setTriggerDialog(prompt)
        setTimeout(() => {
          queueMessage(false, "left", "Please give a prompt with keyword  \n [1] `catalog` for images \n  [2] `seek` for videos \n  [3] `?` for conversation");
          setTriggerDialog("generated");
        }, 2000)
      }
    } catch (err) {
      queueMessage(false, "left", "error", "Generate error, " + err.toString());
    }
  };

  return (
    <div className="glass" style={{"display": (props.disabled || typeof props.library == 'undefined') ? "none" : "flex"}}>
      <div
        className="chatui-chat"
        id="chatui-chat"
        style={{ height: "100" }}
        ref={uiChat}
      >
      </div>
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
    </div>
  );
};

export { ChatUI };
