import React, { useContext, useMemo } from "react";
import { render } from "react-dom";
import "../css/app.css";
import { ChatUI } from "./adapter/chat";
import { useAuthListener, UserContext } from "./Firebase";
import { ChatInterface, ChatModule, ChatWorkerClient } from "@mlc-ai/web-llm";
import meta from './adapter/meta'
import "regenerator-runtime";
import WorkerFactory from "./adapter/factory";
import Asset from "./Asset"

const App = () => {
  const { user, userData } = useAuthListener();
  let chat: ChatInterface;
  if (meta.use_web_worker) {
    chat = useMemo(() =>  new ChatWorkerClient(WorkerFactory()), []);
  } else {
    chat = useMemo(() => new ChatModule(), []);
  }

  return (
    <div className="app">
        <div id="heading">
            <div id="title">
                hedwigAI
            </div>
            <div>
              <img src={Asset.LANDING_LOGO} id="landing" alt="hedwigAI" />
            </div>
            
        </div>
        <div className="main">
            <ChatUI chatInterface={chat} deactive={user !=null}/>
        </div>
    </div>
  );
};

render(<App />, document.getElementById("root"));
