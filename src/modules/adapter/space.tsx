import { Library } from "hedwigai";
import ForceGraph3D from '3d-force-graph';
import React, { useEffect } from "react";
import '../../css/space.css';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

interface SpaceProps {
    library: Library;
}

const SpaceUI: React.FC<SpaceProps> = (props: SpaceProps) => {

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
        const graph = ForceGraph3D()(ref.current);
        ref.current.querySelector('.scene-tooltip')?.setAttribute('style', 'color: black;');
        graph.backgroundColor('white');
        graph.graphData(graphData);
        graph.nodeAutoColorBy('path');
        graph.linkColor('black');
        graph.linkOpacity(1.0);
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
        graph.onNodeClick(node => {
            // Aim at node from outside it
            const distance = 10;
            const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

            const newPos = node.x || node.y || node.z
                ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
                : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

            graph.cameraPosition(
                newPos, // new position
                node, // lookAt ({ x, y, z })
                3000  // ms transition duration
            );
        });

    }, [graphData])

    return (
        <div ref={ref} className="spaceui">
        </div>
    )
}

export { SpaceUI }