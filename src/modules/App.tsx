import React, { useEffect } from "react";
import { render } from "react-dom";
import "../css/app.css";
import "../css/bar.css";
import "../css/notification.css";
import "../css/button.scss";
import "../css/stars.scss";
import "../css/switch.scss";
import "../css/signing.css";
import "../css/Toast.css";
import Toast from "./components/Toast";
import "../css/landing.css";
import "../css/glass-button.css";
import { ChatUI } from "./components/chat";
import { AtlasUI } from "./components/atlas";
import "regenerator-runtime";
import Asset from "./Asset"
import { SearchUI } from "./components/search";
import config from "./Config";
import { isMobile } from "react-device-detect";
import { Library } from "hedwigai";

enum Pane {
  CHAT,
  SEARCH
}

const App = () => {
  
  const [email, setEmail] = React.useState<string>("");
  const [library, setLibrary] = React.useState<Library>();
  const [pane, setPane] = React.useState<Pane>(Pane.CHAT);
  const [idToken, setIdToken] = React.useState<string>("");
  const [signing, setSigning] = React.useState<boolean>(false);
  const [libraryReady, setLibraryReady] = React.useState(false);
  const [signInText, setSignInText] = React.useState("Sign In");
  const [healthStatus, setHealthStatus] = React.useState("❌");;
  
  useEffect(() => {
    setLibrary(new Library())

    return () => {
      setSigning(false);
      document.getElementById("email-bar")?.removeAttribute("disabled");
      setEmail("");
      setIdToken("");
      setSignInText("Sign In");
      setLibraryReady(false);
    }
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
        }, 1000);
      } else {
        setHealthStatus("❌")
      }
    })
  }, [library])

  const interactWithSignButton = () => {
    if(signing) return;
    if (typeof library == 'undefined' || libraryReady) {
      setSigning(false);
      document.getElementById("email-bar")?.removeAttribute("disabled");
      setEmail("");
      setIdToken("");
      setSignInText("Sign In");
      setLibraryReady(false);
    } else {
      setSigning(true);
      library.signIn(email, config.HEDWIGAI_PASSWORD).then((success: Boolean) => {
        if(success) {
          Toast("Welcome 🎉")
          setIdToken(library.getIdToken());
          setLibraryReady(true)
        } else {
          Toast("Credentials are ❌")
        }
        setSigning(false)
      })
    }
  };
  
  const [notification, setNotification] = React.useState<{[key: string]: string}>({});

  useEffect(() => {
    if (typeof library == 'undefined') return;
    if(libraryReady) {
      document.getElementById("email-bar")?.setAttribute("disabled", "true");
      setSignInText("Sign Out");    

      setInterval(() => {
        (async () => await library.getNotification().then((value: {[key: string]: string}) => {
          if (typeof value == 'undefined' || typeof value['commit_id'] == 'undefined') return;
          if (value["commit_id"].length > 0) {
            setNotification(value)
          }
        }))();
      }
      , 3000);
    }
  }, [libraryReady])

  const notificationClick = () => {
    if (typeof library == 'undefined') return;
    if (libraryReady && Object.keys(notification).length > 0) {
      Toast("🎉 New Update Available 🎉")
      Toast(notification["message"])
      library.commitNotification(notification["commit_id"]).then(() => {
        setNotification({})
      }).catch((error) => {
        console.log(error)
      })
    }
  }
  const registerEnterKeyOnEmail = (event) => {
    if (event.keyCode === 13) {
      interactWithSignButton();
    }
  };

  useEffect(() => {
    const element = document.querySelector('.active')
    if (typeof element == 'undefined' || element == null) return;
    if (pane == Pane.SEARCH) {
      element.style.left = '50%';
    } else {
      element.style.left = '0%';
    }
  }, [pane])


  return (
    <div className="app">
        <div className="bar">
          <div id="logo" style={{"paddingTop": "0.5rem", display: libraryReady ? "flex" : "none"}}>
            <img src={Asset.LANDING_LOGO} style={{"width": "2rem"}} alt="hedwigAI" />
            <div id="title">
                    hedwigAI
            </div>
            <button type="button" className="icon-button" onClick={notificationClick}>
              <span className="material-icons">notifications</span>
              <span className="icon-button__badge" style={{"display": Object.keys(notification).length > 0  ? "flex" : "none"}}>1</span>
            </button>
          </div>
          {
            libraryReady && typeof library != 'undefined' && (
              <div className="switch-button">
                <span className="active"></span>
                <button className={`switch-button-case ${pane == Pane.CHAT ? "active-case" : "inactive-case"}`} onClick={() => setPane(Pane.CHAT)}>
                    Chat
                </button>
                <button className={`switch-button-case ${pane == Pane.SEARCH ? "active-case right" : "inactive-case"}`}  onClick={() =>  setPane(Pane.SEARCH)}>
                  Search
                </button>
              </div>
            )
          }
          <div className="controls" style={{display: libraryReady ? "flex" : "none"}}>
            <input id="email-bar" type="text" placeholder="Enter Account Email" value={email} onKeyDown={registerEnterKeyOnEmail} onChange={(e) => setEmail(e.target.value)} />
            <div className='btn-star' style={{"width": "4rem", "textAlign": "center"}} onClick={interactWithSignButton}>
                <span className="top_left"></span>
                <span className="top_right"></span>
                <span className="title">
                  {signInText}
                </span>
                <span className="bottom_right"></span>
                <span className="bottom_left"></span>
            </div>
            <div id="server-health">{healthStatus}</div>
            </div>
          </div>
        <div className="main">
          <div className="stars">
            <div id="stars1"></div>
            <div id="stars2"></div>
            <div id="stars3"></div>
          </div>
          {
            libraryReady && typeof library != 'undefined' && pane==Pane.CHAT && <ChatUI library={library}/>
          }
          {
            libraryReady && typeof library != 'undefined' && pane==Pane.CHAT && !isMobile && <AtlasUI library={library}/>
          }
          {
            libraryReady && typeof library != 'undefined' && pane==Pane.SEARCH && <SearchUI library={library} />
          }
          {
            libraryReady && typeof library != 'undefined' && pane==Pane.FILES && <FilesUI library={library} />
          }
          {
            !libraryReady && (<div className="landing">
                <br/>
                <h1>hedwigAI </h1>
                <h2>Your ai powered knowledge graph</h2>
                <img src={libraryReady ? "" : Asset.LANDING_LOGO} alt="hedwigAI" style={{"position": "absolute", "top": "0vh", "width": "5rem"}} />
                <div className='controls' style={{display: !libraryReady ? "flex" : "none", columnGap: "0.8rem"}}>
                    <input id="email-landing" type="text" placeholder="Enter Account Email" value={email} onKeyDown={registerEnterKeyOnEmail} onChange={(e) => setEmail(e.target.value)}>
                    </input>
                    <div className={`btn-star ${signing ? "active" : ""}`} style={{"width": "3rem"}} onClick={interactWithSignButton}>
                      <span className="top_left"></span>
                      <span className="top_right"></span>
                      <span className={`title ${signing ? "hide" : ""}`}>
                        {signInText}
                      </span>
                      <span className="bottom_right"></span>
                      <span className="bottom_left"></span>
                      <span className={`${signing ? "rotate-span" : "hide"}`}><i className="fa fa-refresh"></i></span>
                    </div>
                    
                </div>
                <div id="server-health">Serverless {healthStatus}</div>
              </div>)
          }
        </div>
    </div>
  );
};

render(<App />, document.getElementById("root"));
