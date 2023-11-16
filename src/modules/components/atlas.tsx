import React, { useEffect } from "react";
import '../../css/atlas.css';
import * as THREE from 'three';
import { Library } from "hedwigai";
import ForceGraph3D from '3d-force-graph';
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
        props.library.getGraph().then((graph) => {
            setGraphData(graph);
        })
    }, [])

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
        <div ref={ref} className="atlasui">
        </div>
    )
}

export { AtlasUI }