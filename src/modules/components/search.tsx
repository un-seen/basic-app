import React, { useEffect } from "react";
import { Library } from "hedwigai";
import "../../css/search.css";
import Toast from "./Toast.js";
import { convertSeconds } from "./math";

interface SearchItem {
	id: string;
	image: string;
	caption: string;
}

interface SearchProps {
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
		props.library.findVideo(prompt, 100).then((frames) => {
			const items: SearchItem[] = []
			for (const item of frames["response"]) {
				items.push({
					id: item["id"],
					image: item["frame"],
					caption: item['caption'],
				});
			}
			props.library.findImage(prompt, 100).then((images) => {
				images = JSON.parse(images["response"])
				console.log(images)
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
							console.log(item)
							const imageInfo = `data:image/jpeg;base64,${(item.image).replace(/^b'|'$/g, "")}`;
							return (
								<li className="thumb-wrap">
									<a>
										<img className="thumb"  src={imageInfo} alt={item.caption}/>
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