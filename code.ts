import { stringify } from "circ-json"




const ui = {
  log: (message: string, options: Omit<NotificationOptions, "error"> = {timeout: 2000}) => {
    let n: NotificationHandler;
    const prom = new Promise<NotifyDequeueReason>((res) => {
      n = figma.notify(message, {...options, onDequeue: res});  
    }) as Promise<NotifyDequeueReason> & {cancel: () => void}
    prom.cancel = () => {n.cancel()}
    return prom;
  },
  error: (message: string, options: Omit<NotificationOptions, "error" | "onDequeue"> = {timeout: 2000}) => {
    let n: NotificationHandler;
    const prom = new Promise<NotifyDequeueReason>((res) => {
      n = figma.notify(message, {...options, error: true, onDequeue: res});  
    }) as Promise<NotifyDequeueReason> & {cancel: () => void}
    prom.cancel = () => {n.cancel()}
    return prom;
  }
}


const arrowLike = ["ARROW_LINES", "ARROW_EQUILATERAL"]
function computeDirectionOfEdge(connector: ConnectorNode) {
  if (arrowLike.includes(connector.connectorEndStrokeCap)) {
    if (arrowLike.includes(connector.connectorStartStrokeCap)) {
      return {directional: "BI"} as const
    }
    else {
      return {dir: {
        to: "connectorEnd",
        from: "connectorStart"
      }, directional: "UNI"} as const
    }
  }
  else {
    if (arrowLike.includes(connector.connectorStartStrokeCap)) {
      return {dir: {
        to: "connectorStart",
        from: "connectorEnd"
      }, directional: "UNI"} as const
    }
    else {
      return {directional: "BI"} as const
    }
  }

}


// get all selected nodes
figma.skipInvisibleInstanceChildren = true

function getNodeFromId(id: string) {
  return figma.getNodeById(id);
}

interface Element {
  text: string;
  id: string;
  type: "NODE" | "EDGE",
}

interface Edge extends Element {
  from: Node,
  to?: Node,
  fromSide?: ConnectorEndpointEndpointNodeIdAndMagnet["magnet"]
  toSide?: ConnectorEndpointEndpointNodeIdAndMagnet["magnet"]
  color?: {r: number, g: number, b: number},
  edgeType: ConnectorNode["connectorLineType"],
  directional: "UNI" | "BI"
}

interface Node extends Element {
  edges: Edge[],
  color?: {r: number, g: number, b: number},
  nodeType: SceneNode["type"],
}




const knownEdges = new Set<string>();
const knownNodes = new Map<string, Node>();
function traverse(node: SceneNode) {
  if (knownNodes.has(node.id)) {
    return knownNodes.get(node.id);
  }
  
  const edges: Edge[] = []
  const myNode: Node = {
    text: node.name,
    id: node.id,
    type: "NODE",
    edges,
    color: (node as any)?.fills[0]?.color,
    nodeType: node.type
  }

  knownNodes.set(node.id, myNode);

  for (const connector of node.attachedConnectors) {
    if (knownEdges.has(connector.id)) {
      console.log(connector)
      
      continue
    }
    
    
    const {directional, dir} = computeDirectionOfEdge(connector);


    const from = directional === "BI" ? (connector.connectorStart as ConnectorEndpointEndpointNodeIdAndMagnet)?.endpointNodeId === myNode.id ? "connectorStart" : "connectorEnd" : dir.from;

    const fromIsMy = (connector[from] as ConnectorEndpointEndpointNodeIdAndMagnet)?.endpointNodeId === myNode.id;
    if (!fromIsMy) continue

    const to = directional === "BI" ? (connector.connectorEnd as ConnectorEndpointEndpointNodeIdAndMagnet)?.endpointNodeId === myNode.id ? "connectorEnd" : "connectorStart" : dir.to;
    

    const edge: Edge = {
      text: connector.name,
      id: connector.id,
      from: myNode,
      type: "EDGE",
      color: (connector.strokes[0] as SolidPaint)?.color,
      fromSide: (connector[from] as ConnectorEndpointEndpointNodeIdAndMagnet)?.magnet,
      toSide: (connector[to] as ConnectorEndpointEndpointNodeIdAndMagnet)?.magnet,
      edgeType: connector.connectorLineType,
      directional
    }
    edges.push(edge);

    
    
    const otherEndpointNodeId = (connector[to] as ConnectorEndpointEndpointNodeIdAndMagnet)?.endpointNodeId


    
    if (otherEndpointNodeId) {
      const otherNode = getNodeFromId(otherEndpointNodeId);

      if (otherNode && !otherNode.removed && otherNode.type !== "DOCUMENT" && otherNode.type !== "PAGE") {
        edge.to = traverse(otherNode);
      }
      
    }

    knownEdges.add(connector.id);
  }


  return myNode
}


const selection = figma.currentPage.selection;

if (selection.length !== 1) {
  (async () => {
    await ui.error("Please select a single node as root")
    figma.closePlugin();
  })()
}
else {
  const node = traverse(selection[0]);
  console.log(node);
  const stringified = stringify(node, 2);
  console.log(stringified);



  (async () => {
    // open window with stringified json inside
    figma.showUI(__html__, { themeColors: true, width: 500, height: 400 })
    figma.ui.postMessage(stringified)

    // wait for message from window
    figma.ui.onmessage = async (msg) => {
      if (msg.type === "copy-success") {
        figma.ui.close()
        await ui.log("Copied to clipboard")
      }
      else if (msg.type === "copy-fail") {
        // await ui.error("Failed to copy to clipboard")
      }

      figma.closePlugin();
    }
    
    
  })()

}


// Make sure to close the plugin when you're done. Otherwise the plugin will
// keep running, which shows the cancel button at the bottom of the screen.
// figma.closePlugin();
