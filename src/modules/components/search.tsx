import React, { useEffect } from "react";
import { Library } from "hedwigai";
import "../../css/search.css";
import Toast from "./Toast.js";
import { convertSeconds } from "./math";

interface SearchItem {
	id: string;
	url: string;
	image: string;
	caption: string;
	timestamp: string;
}

interface SearchProps {
	disabled: boolean;
	library: Library;
}

const SearchUI: React.FC<SearchProps> = (props: SearchProps) => {

	const [prompt, setPrompt] = React.useState<string>("Write your search term here...");
	const [searchItems, setSearchItems] = React.useState<SearchItem[]>([]);
	const [typingTimeout, setTypingTimeout] = React.useState<NodeJS.Timeout>();
	const [loading, setLoading] = React.useState<boolean>(false);

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
		props.library.seekVideo(prompt, 10).then((frames) => {
			const items: SearchItem[] = []
			for (const item of frames["response"]) {
				items.push({
					id: item["id"],
					url: item["path"],
					image: item["frame"],
					caption: item['caption'],
					timestamp: convertSeconds(item['timestamp'])
				});
			}
			setSearchItems([...items])
		})
	}, [prompt])

	useEffect(() => {
		setLoading(false)
	}, [searchItems])

    return (
        <div className="searchui">

			<div className="sec">
				<input
				className="sec-title"
				type="text"
				style={{"display": searchItems.length == 0 ? "none" : "block", width: "80rem"}}
				onChange={handlePromptChange}
				placeholder="Type here..."
				/>
				<ul className="sec-middle" id="vid-grid">
					{
						searchItems.map((item) => {
							const imageInfo = `data:image/jpeg;base64,${(item.image).replace(/^b'|'$/g, "")}`;
							return (
								<li className="thumb-wrap">
									<a>
										<img className="thumb"  src={imageInfo} alt={item.caption}/>
										<div className="thumb-info">
											<p className="thumb-title">{item.caption}</p>
											<p className="thumb-user">{item.url}</p>
											<p className="thumb-text">{item.timestamp}</p>
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