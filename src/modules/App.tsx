import React, { useEffect } from "react";
import { render } from "react-dom";
import "../css/app.css";
import "../css/bar.css";
import "../css/landing.css";
import { ChatUI } from "./components/chat";
import "regenerator-runtime";
import Asset from "./asset"
import { SpaceUI } from "./components/space";
import { Library } from "hedwigai";
import config from "./config";

const App = () => {
  
  const [email, setEmail] = React.useState("");
  const [library, setLibrary] = React.useState<Library>();
  const [healthOk, setHealthOk] = React.useState(false);
  const [libraryReady, setLibraryReady] = React.useState(false);
  const [signInText, setSignInText] = React.useState("Sign In");
  const [healthStatus, setHealthStatus] = React.useState("Server ❌");;
  
  const signIn = () => {
    if (libraryReady) {
      document.getElementById("library-email")?.setAttribute("disabled", "false");
      setLibraryReady(false);
      setSignInText("Sign In");
    }
    setLibrary(
      new Library({ deployment: config.HEDWIGAI_DEPLOYMENT, email: email, password: config.HEDWIGAI_PASSWORD, url: config.HEDWIGAI_URL })
    )
  };

  useEffect(() => {
    if (typeof library == 'undefined') return;
    library.healthCheck().then((result) => {
      if (result["healthy"] === "yes") {
        setHealthStatus("Server ✅");
        setInterval(() => {
          (async () => await library.isWorking().then((value) => {
            if (value) {
              setHealthStatus("Server 🔥")
            } else {
              setHealthStatus("Server ✅")
            }
          }))();
        }, 3000);
        setHealthOk(true)
      } else {
        setHealthStatus("Server Disconnected ❌")
        setHealthOk(false)
      }
    })
    library.signIn().then((success: Boolean) => {
      if (success) {
        document.getElementById("library-email")?.setAttribute("disabled", "true");
        setSignInText("Sign Out");
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
            <button id="sign-in" onClick={signIn}>{signInText}</button>
            <div id="server-health">{healthStatus}</div>
          </div>
        </div>
        <div className="main">
          {
            libraryReady && typeof library != 'undefined' && <ChatUI deactive={typeof library != 'undefined'} library={library}/>
          }
          {
            libraryReady && typeof library != 'undefined' && <SpaceUI library={library}/>
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
