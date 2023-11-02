import React, { useEffect } from "react";
import '../../css/space.css';
import * as THREE from 'three';
import { Library } from "hedwigai";

interface AtlasProps {
    library: Library;
}

const AtlasUI: React.FC<AtlasProps> = (props: AtlasProps) => {

    const ref = React.createRef<HTMLDivElement>();
    const [graphData, setGraphData] = React.useState<any>({ nodes: [], links: [] });

    useEffect(() => {
        props.library.getGraph().then((graph) => {
            setGraphData(graph);
        })
    }, [])

    useEffect(() => {
        if (ref.current == null) {
            return;
        }
        // TODO at Graph Init

        // TODO at Node Click
        const nodeClick = (node, distance) => {
        }
    }, [graphData])

    return (
        <div ref={ref} className="spaceui">
        </div>
    )
}

export { AtlasUI }