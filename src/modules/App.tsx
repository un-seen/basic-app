import React, { useContext, useEffect, useMemo } from "react";
import { render } from "react-dom";
import "../css/app.css";
import "../css/bar.css";
import "../css/landing.css";
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
  const [email, setEmail] = React.useState<string>();
  const [password, setPassword] = React.useState<string>();
  
  const signIn = () => {
    if (libraryReady) {
      document.getElementById("library-email")?.setAttribute("disabled", "false");
      document.getElementById("library-password")?.setAttribute("disabled", "false");
      setLibraryReady(false);
      if (signInButton.current != null) {
        signInButton.current.textContent = "Sign In";  
      };
    }
    setLibrary(
      new Library({
        email: email,
        password: password,
        url: config.HEDWIGAI_URL,
        embedded: false
      })
    )
  };

  useEffect(() => {
    if (typeof library == 'undefined') return;
    library.healthCheck().then((result) => {
      if (result["healthy"] === "yes") {
        healthStatus.current.textContent = "Server ✅";
        setInterval(() => {
          if(library.isWorking()) {
            healthStatus.current.textContent = "Server 🔥";
          } else {
            healthStatus.current.textContent = "Server ✅";
          }
        }, 3000);
        setHealthOk(true)
      } else {
        healthStatus.current.textContent =
          "Server Disconnected ❌";
        setHealthOk(false)
      }
    })
    library.signIn().then((success: Boolean) => {
      if (success) {
        document.getElementById("library-email")?.setAttribute("disabled", "true");
        document.getElementById("library-password")?.setAttribute("disabled", "true");
        signInButton.current.textContent = "Sign Out";
        setLibraryReady(true);
      }
    })
  }, [library])

  useEffect(() => {
    if(healthOk && typeof library != 'undefined') {
      console.log(`Health is OK for Library[embedded=${library.isEmbedded()}]`)
    }
  }, [healthOk])
  useEffect(() => {
    if (typeof library == 'undefined' || !libraryReady) return;
    library.setup().then((success: Boolean) => {
      if(!success) {
        console.log("Failed to setup library");
        return;
      }
      console.log("Successfuly setup library");
      window.library = library
    })
  }, [libraryReady])

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
            <label>
              Email:
              <input id="library-email" type="text" onChange={(e) => setEmail(e.target.value)} />
            </label>
            <br />
            <label>
              Password:
              <input id="library-password" type="password" onChange={(e) => setPassword(e.target.value)} />
            </label>
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
          {
            !libraryReady && (<div className="landing">
                <h1>hedwigAI </h1>
                <br></br>
                <h2>Your ai powered knowledge graph</h2>
              <img src={Asset.LANDING_LOGO} alt="hedwigAI" />
              </div>)
          }
        </div>
    </div>
  );
};

render(<App />, document.getElementById("root"));
