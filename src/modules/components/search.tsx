import React, { useEffect } from "react";
import { Library } from "hedwigai";
import "../../css/search.css";
import Toast from "./Toast.js";
import "../../css/fog.css";

interface SearchItem {
	id: string;
	image: string;
	caption: string;
}

interface SearchProps {
	library: Library;
}

function stringSimilarity(str1: String, str2: String): number {
    const maxLength = Math.max(str1.length, str2.length);
    let matchingChars = 0;

    for (let i = 0; i < maxLength; i++) {
        if (str1[i] && str2[i] && str1[i] === str2[i]) {
            matchingChars++;
        }
    }

    return (matchingChars / maxLength) * 100;
}


const SearchUI: React.FC<SearchProps> = (props: SearchProps) => {

	const [prompt, setPrompt] = React.useState<string>("Write your search term here...");
	const [searchItems, setSearchItems] = React.useState<SearchItem[]>([]);
	const [typingTimeout, setTypingTimeout] = React.useState<NodeJS.Timeout>();
	const [loading, setLoading] = React.useState<boolean>(false);	
	
	const [inFocus, setInFocus] = React.useState<SearchItem>();
	const [editCaption, setEditCaption] = React.useState<boolean>(false);
	const [newCaption, setNewCaption] = React.useState<string>("");
	

	const handlePromptChange = (e) => {
	  const text = e.target.value;
	  // Clear the previous timeout
	  clearTimeout(typingTimeout);
	  // Set a new timeout to update state after 2 seconds
	  const newTimeout = setTimeout(() => setPrompt(text), 2000);
	  setTypingTimeout(newTimeout);
	};

	useEffect(() => {
		setLoading(true)
		Toast("Searching 🔍")
		props.library.getLatestPrompt(10).then((response) => {
			const prompts = JSON.parse(response["prompt"])
			if (prompts.length > 0) {
				const suggestion = prompts.sort((a, b) => stringSimilarity(a, prompt) - stringSimilarity(b, prompt)).at(0) as string
				Toast(`History: 🔎 "${suggestion["prompt"]}" ⏱️ ${suggestion['timestamp']}`)
			}
		})
		props.library.findVideo(prompt, 50).then((frames) => {
			const items: SearchItem[] = []
			for (const item of frames["response"]) {
				items.push({
					id: item["id"],
					image: item["frame"],
					caption: item['caption'],
				});
			}
			
			props.library.findImage(prompt, 50).then((images) => {
				images = JSON.parse(images["response"])
				for (const item of images) {
					items.push({
						id: item["id"],
						image: item["image"],
						caption: item['caption'],
					});
				}
				setSearchItems([...items])
			})
			
		})
	}, [prompt])

	useEffect(() => {
		setLoading(false)
	}, [searchItems])

	useEffect(() => {
		if(typeof inFocus === 'undefined') {
			setEditCaption(false)
		}
	}, [inFocus])

	useEffect(() => {
		if(editCaption) {
			setNewCaption(inFocus?.caption)
		} else {
			setNewCaption("")
		}
	}, [editCaption])

	const saveCaption = () => {
		// Save the new caption for the chunk
		if (typeof inFocus === 'undefined') {
			return
		}
		const chunkId = inFocus.id;
		props.library.saveCaption(chunkId, newCaption).then(() => {
			Toast(`Saved ${inFocus?.id} ✅`)
			setInFocus({...inFocus, caption: newCaption})
			setSearchItems(searchItems.map((item) => {
				if(item.id === chunkId) {
					return {...item, caption: newCaption}
				}
				return item
			}))
		})
		// Save the new caption for the current frame
		setEditCaption(false)
	}

    return (
        <div className="searchui">
			<div className="focus" style={{"display": typeof inFocus != 'undefined' ? "flex" : "none"}}>
				<div id="foglayer_01" className="fog"  onClick={() => setInFocus(undefined)}>
					<div className="image01"></div>
					<div className="image02"></div>
				</div>
				<div id="foglayer_02" className="fog"  onClick={() => setInFocus(undefined)}>
					<div className="image01"></div>
					<div className="image02"></div>
				</div>
				<div id="foglayer_03" className="fog"  onClick={() => setInFocus(undefined)}>
					<div className="image01"></div>
					<div className="image02"></div>
				</div>
				<img src={`data:image/jpeg;base64,${(inFocus?.image).replace(/^b'|'$/g, "")}`} alt={inFocus?.caption} />
				<div className="content">
					<textarea value={inFocus?.caption} style={{"display": editCaption ? "none" : "flex", color: "limegreen"}} onMouseOver={() => Toast("Press ⤶ to edit")} onKeyDown={(ev) => {ev.key === 'Enter' ? setEditCaption(true) : null}}></textarea>
					<textarea value={newCaption} style={{"display": editCaption ? "flex" : "none", color: "yellow"}} onMouseOver={() => Toast("Click ✅ to save")}  onChange={(ev) => setNewCaption(ev.target.value)}></textarea>
					<button onClick={saveCaption} style={{"display": editCaption ? "flex" : "none"}}>✅</button>
					<text>{`file_id: ` + inFocus?.id}</text>
					<div className="border-blur"></div>
				</div>
			</div>
			<div className="sec">
				<input
				className="sec-title"
				type="text"
				style={{"display": searchItems.length == 0 ? "none" : "block", width: "80rem"}}
				onChange={handlePromptChange}
				placeholder={"Type here..."}
				/>
				<ul className="sec-middle" id="vid-grid">
					{
						searchItems.map((item) => {
							const imageInfo = `data:image/jpeg;base64,${(item.image).replace(/^b'|'$/g, "")}`;
							return (
								<li className="thumb-wrap">
									<a>
										<img className="thumb"  src={imageInfo} alt={item.caption} onClick={() => setInFocus(item)}/>
										<div className="thumb-info">
											<p className="thumb-title">{item.caption}</p>
										</div>
									</a>
								</li>
							)
						})
					}
				</ul>
			</div>
			
        </div>
    )
}

export { SearchUI }