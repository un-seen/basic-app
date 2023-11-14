import React, { useEffect } from "react";
import { Library } from "hedwigai";
import "../../css/search.css";

interface SearchProps {
    library: Library;
}

interface File {
	id: string;
	url: string;
	image: string;
	roomType: RoomType;
}

enum RoomType {
	CONVERSATION,
	VIDEO,
	IMAGE
}

const SearchUI: React.FC<SearchProps> = (props: SearchProps) => {

	const [searchTerm, setSearchTerm] = React.useState<string>("Write your search term here...");
	const [files, setFiles] = React.useState<Array<string>>([]);

    return (
        <div className="searchui">
            <article className="sec-wrap">
			<div className="sec">
				<p className="sec-title">{searchTerm}</p>
				<ul className="sec-middle" id="vid-grid">

					<li className="thumb-wrap"><a href="">
						<img className="thumb" src="https://images.unsplash.com/photo-1555661225-ade1bbf3fbb3?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1957&q=80" alt="" />
						<div className="thumb-info">
							<p className="thumb-title">This is the longest title of them all, such a long title that it is beeing cut off</p>
							<p className="thumb-user">Username</p>
							<p className="thumb-text">1.3K Views</p>
						</div>
					</a></li>

					<li className="thumb-wrap"><a href="">
						<img className="thumb" src="https://images.unsplash.com/photo-1566075247408-2fc9e74810d2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80" alt="" />
						<div className="thumb-info">
							<p className="thumb-title">Video Title 2 - Super Long Title With Really Long New Line</p>
							<p className="thumb-user">Username</p>
							<p className="thumb-text">57K Views</p>
						</div>
					</a></li>

					<li className="thumb-wrap"><a href="">
						<img className="thumb" src="https://images.unsplash.com/photo-1559083991-9bdef0bb5a39?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1955&q=80" alt="" />
						<div className="thumb-info">
							<p className="thumb-title">Video Title 3 - Short Title</p>
							<p className="thumb-user">Username</p>
							<p className="thumb-text">4.6K Views</p>
						</div>
					</a></li>

				</ul>
				<a className="showmore">Show more</a>
			</div>
		</article>
        </div>
    )
}

export { SearchUI }