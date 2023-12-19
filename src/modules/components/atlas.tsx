import React, { useEffect } from "react";
import '../../css/atlas.css';
import * as THREE from 'three';
import { Library } from "hedwigai";
import ForceGraph3D from '3d-force-graph';
import prettyBytes from 'pretty-bytes';
import '../../css/files.css';
import Toast from "./Toast";

enum Atlas {
    Graph3D,
    Graph2D,
    Files
}

interface FileItem {
	id: string;
	extension: string;
    size: string;
	last_modified: string;
    last_indexed: string;
}

interface AtlasProps {
    library: Library;
}

const LARGE_NUMBER = 100000

const AtlasUI: React.FC<AtlasProps> = (props: AtlasProps) => {

    const ref = React.createRef<HTMLDivElement>();
    const [graphData, setGraphData] = React.useState<any>({ nodes: [], links: [] });
    const [atlas, setAtlas] = React.useState<Atlas>(Atlas.Files);
    const [files, setFiles] = React.useState<any[]>([]);

    useEffect(() => {
        if (atlas === Atlas.Files) {
            props.library.getFiles(LARGE_NUMBER).then((response: unknown) => {
                if (!response) {
                    return
                }
                let files = response["response"]
                let data: FileItem[] = []
                for(const item of files) {
                    let file_id = item["id"]["id"]["String"]
                    if (file_id.indexOf("/") > 0) {
                        file_id = file_id.slice(file_id.indexOf("/") + 1)
                    }

                    data.push({
                        "id": file_id,
                        "extension": item["extension"],
                        "size": prettyBytes(item["size"]),
                        "last_modified": item["last_modified"],
                        "last_indexed": item["last_indexed"]
                    })
                }
                Toast(`Found ${data.length} files 📚`)
                setFiles(data);
            })
        } else if (atlas === Atlas.Graph2D || atlas === Atlas.Graph3D) {
            props.library.getGraph().then((graph) => {
                setGraphData(graph);
            })
        }
    }, [graphData])


    useEffect(() => {
        if (ref.current == null) {
            return;
        }
        const graph = ForceGraph3D()(ref.current);
        ref.current.querySelector('.scene-tooltip')?.setAttribute('style', 'color: lime; font-family: VT323; font-size: 1.0rem');
        graph.backgroundColor('rgb(0, 0, 0, 0)');
        graph.graphData(graphData);
        graph.nodeAutoColorBy('path');
        graph.linkColor('white');
        graph.linkOpacity(0.3);
        graph.nodeLabel(node => node.label);

        graph.nodeThreeObject(node => {
            if ((node.image).length > 0) {
                let image = new Image();
                image.src = 'data:image/jpeg;base64,' + node.image;
                let texture = new THREE.Texture();
                texture.image = image;
                image.onload = function () {
                    texture.needsUpdate = true;
                };
                const material = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(material);
                sprite.scale.set(12, 12, 12);
                return sprite;
            }
        })
        const calculateNewCameraPosition = (
            cameraPosition: THREE.Vector3,
            nodePosition: THREE.Vector3,
            distance: number
          ): THREE.Vector3 => {
            // Calculate the direction vector from the camera to the node
            const direction = nodePosition.clone().sub(cameraPosition).normalize();
            // Compute the new camera position by moving backward along the direction vector
            const newPosition = nodePosition.clone().sub(direction.multiplyScalar(distance));
            return newPosition
          }
        graph.onNodeClick(node => {
            // nodeClick(node, 40)
            const newPosition = calculateNewCameraPosition(graph.cameraPosition(), new THREE.Vector3(node.x + 0.5, node.y, node.z), 38.5)
            graph.cameraPosition(
                newPosition, // new position
                node, // lookAt ({ x, y, z })
                3000  // ms transition duration
              );
        });
    }, [graphData])

    return (
        
        <div style={{"display": "flex", alignItems: "center", justifyContent: "center", width: "50%"}}>
            { atlas == Atlas.Files ? (
                <table className="container" style={{borderWidth: files.length > 0 ? "0.01rem" : "0"}}>
                <tbody>
                    <tr style={{"display": files.length > 0 ? "" : "none"}} key={"header"}>
                        <th><h1>id</h1></th>
                        <th><h1>extension</h1></th>
                        <th><h1>size</h1></th>
                        <th><h1>last_modified</h1></th>
                        <th><h1>last_indexed</h1></th>
                    </tr>
                    {files.map((file) => {
                        return <tr key={file.id}>
                            <td>{file.id}</td>
                            <td>{file.extension}</td>
                            <td>{file.size}</td>
                            <td>{file.last_modified}</td>
                            <td>{file.last_indexed}</td>
                        </tr>
                    })}
                </tbody>
                </table>
            ) : null }
            { atlas == Atlas.Graph3D ? <div ref={ref} className="graph-container"></div> : null }
            { atlas == Atlas.Graph2D ? <div ref={ref} className="graph-container"></div> : null }
        </div>
        
    )
}

export { AtlasUI }