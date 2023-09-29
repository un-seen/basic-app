import React, { useContext, useEffect, useMemo } from "react";
import { render } from "react-dom";
import "../css/app.css";
import "../css/bar.css";
import { ChatUI } from "./adapter/chat";
import { useAuthListener, UserContext } from "./Firebase";
import { ChatInterface, ChatModule, ChatWorkerClient } from "@mlc-ai/web-llm";
import meta from './adapter/meta'
import "regenerator-runtime";
import WorkerFactory from "./adapter/factory";
import Asset from "./Asset"
import { SpaceUI } from "./adapter/space";
import { Library } from "hedwigai";
import config from "./Config";

const App = () => {
  
  let chat: ChatInterface;
  if (meta.use_web_worker) {
    chat = useMemo(() =>  new ChatWorkerClient(WorkerFactory()), []);
  } else {
    chat = useMemo(() => new ChatModule(), []);
  }
  const { user, userData } = useAuthListener();
  const [library, setLibrary] = React.useState<Library>();
  const [healthOk, setHealthOk] = React.useState(false);
  const [libraryReady, setLibraryReady] = React.useState(false);
  const signInButton = React.useRef<HTMLButtonElement>(null);
  const healthStatus = React.useRef<HTMLDivElement>(null);
  
  const signIn = () => {
    if (!healthOk || library == null) return;
    console.log("Signing in");
    library.signIn().then((success: Boolean) => {
      console.log("Signed in");
      if (success) {
        signInButton.current.textContent = "Signed In";
        setLibraryReady(true);
      } else {
        signInButton.current.textContent = "Try Sign In";
        setLibraryReady(false);
      }
    })
  };

  
  useEffect(() => {
    if (library == null || healthStatus.current == null) return;
    library.healthCheck().then((result) => {
      if (result["healthy"] === "yes") {
        healthStatus.current.textContent = "Server ✅";
        setHealthOk(true)
      } else {
        healthStatus.current.textContent =
          "Server Disconnected ❌";
        setHealthOk(false)
      }
    })
  }, [library])

  useEffect(() => {
    console.log("Setting up library");
    setLibrary(
      new Library({
        email: config.HEDWIGAI_EMAIL,
        password: config.HEDWIGAI_PASSWORD,
        url: config.HEDWIGAI_URL,
      })
    );
  }, []);

  return (
    <div className="app">
        <div className="bar">
          <div id="logo">
            <div id="title">
                  hedwigAI
            </div>
            <img src={Asset.LANDING_LOGO} style={{"width": "2vw"}} alt="hedwigAI" />
          </div>
          <div className="controls">
            <button id="sign-in" ref={signInButton} onClick={signIn}>Sign In</button>
            <div id="server-health" ref={healthStatus}>Server ❌</div>
          </div>
        </div>
        <div className="main">
          {
            libraryReady && <ChatUI chatInterface={chat} deactive={user != null} library={library}/>
          }
          {
            libraryReady && <SpaceUI library={library}/>
          }
        </div>
    </div>
  );
};

render(<App />, document.getElementById("root"));
