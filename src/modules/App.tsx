import React, { useEffect } from "react";
import { render } from "react-dom";
import "../css/app.css";
import "../css/bar.css";
import "../css/landing.css";
import "../css/glass-button.css";
import { ChatUI } from "./components/chat";
import { AtlasUI } from "./components/atlas";
import "regenerator-runtime";
import Asset from "./Asset"
import { SpaceUI } from "./components/space";
import { Library } from "hedwigai";
import config from "./Config";
import { useAtom } from "jotai";
import { idTokenAtom, idEmailAtom } from "./store";

const App = () => {
  
  const [email, setEmail] = React.useState<string>("");
  const [savedEmail, setSavedEmail] = useAtom<string>(idEmailAtom);
  const [library, setLibrary] = React.useState<Library>();
  const [idToken, setIdToken] = useAtom<string>(idTokenAtom);
  const [healthOk, setHealthOk] = React.useState(false);
  const [libraryReady, setLibraryReady] = React.useState(false);
  const [signInText, setSignInText] = React.useState("Sign In");
  const [healthStatus, setHealthStatus] = React.useState("❌");;
  
  useEffect(() => {
    setLibrary(
      new Library({ deployment: config.HEDWIGAI_DEPLOYMENT, url: config.HEDWIGAI_URL })
    )
  }, [])

  
  useEffect(() => {
    if (typeof library == 'undefined') return
    library.healthCheck().then((result) => {
      if (result["healthy"] === "yes") {
        setHealthStatus("✅");
        setInterval(() => {
          (async () => await library.isWorking().then((value) => {
            if (value) {
              setHealthStatus("🔥")
            } else {
              setHealthStatus("✅")
            }
          }))();
        }, 3000);
        setHealthOk(true)
      } else {
        setHealthStatus("Server Disconnected ❌")
        setHealthOk(false)
      }
    })
    if(idToken.length > 0) {
      console.log("Signing in with saved token");
      console.log(`saved email: ${savedEmail}`);
      library.setIdToken(idToken)
      setEmail(savedEmail);
      setLibraryReady(true);
    }
  }, [library])

  const signIn = () => {
    if (typeof library == 'undefined' || libraryReady) {
      document.getElementById("library-email")?.removeAttribute("disabled");
      setEmail("");
      setSavedEmail("");
      setIdToken("");
      setSignInText("Sign In");
      setLibraryReady(false);
    } else {
      library.signIn(email, config.HEDWIGAI_PASSWORD).then((success: Boolean) => {
        if(success) {
          setSavedEmail(email);
          setIdToken(library.getIdToken());
          setLibraryReady(true)
        }
      })
    }
  };
  
  useEffect(() => {
    if (typeof library == 'undefined') return;
    if(libraryReady) {
      document.getElementById("library-email")?.setAttribute("disabled", "true");
      setSignInText("Sign Out");    
      library.setup(email).then((success: Boolean) => {
        if(!success) {
          console.log("Failed to setup library");
          return;
        }
        console.log("Successfuly setup library");
      })
    }
  }, [libraryReady])

  const registerEnterKeyOnEmail = (event) => {
    if (event.keyCode === 13) {
      signIn();
    }
  };

  return (
    <div className="app">
        <div className="bar">
          <div id="logo" style={{"paddingTop": "0.5rem"}}>
          <img src={Asset.LANDING_LOGO} style={{"width": "2rem"}} alt="hedwigAI" />
            <div id="title">
                  hedwigAI
            </div>
          </div>
          <div className="controls">
          <input id="library-email" type="text" placeholder="Enter Account Email" value={email} onKeyDown={registerEnterKeyOnEmail} onChange={(e) => setEmail(e.target.value)} />
            <div id="sign-in" className="gbutton" onClick={signIn}>
              <span/><span/><span/>{signInText}
            </div>
            <div id="server-health">{healthStatus}</div>
          </div>
        </div>
        <div className="main">
          {
            libraryReady && typeof library != 'undefined' && <ChatUI deactive={typeof library != 'undefined'} library={library}/>
          }
          {/* {
            libraryReady && typeof library != 'undefined' && <SpaceUI library={library}/>
          } */}
          {
            libraryReady && typeof library != 'undefined' && <AtlasUI library={library}/>
          }
          {
            !libraryReady && (<div className="landing">
                <br/>
                <h1>hedwigAI </h1>
                <h2 style={{"fontFamily": "Roboto, sans-serif"}}>Your ai powered knowledge graph</h2>
              <img src={Asset.LANDING_LOGO} alt="hedwigAI" style={{"position": "absolute", "top": "0vh", "width": "5rem"}} />
              </div>)
          }
        </div>
    </div>
  );
};

render(<App />, document.getElementById("root"));
