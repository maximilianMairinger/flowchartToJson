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
  fromSide: ConnectorEndpointEndpointNodeIdAndMagnet["magnet"]
  toSide?: ConnectorEndpointEndpointNodeIdAndMagnet["magnet"]
  // color?: string,
  edgeType: ConnectorNode["connectorLineType"]
}

interface Node extends Element {
  edges: Edge[],
  color?: string,
  nodeType: SceneNode["type"],
}




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

  for (const connectors of node.attachedConnectors) {
    const edge: Edge = {
      text: connectors.name,
      id: connectors.id,
      type: "EDGE",
      from: myNode,
      fromSide: (connectors.connectorStart as ConnectorEndpointEndpointNodeIdAndMagnet)?.magnet,
      toSide: (connectors.connectorStart as ConnectorEndpointEndpointNodeIdAndMagnet)?.magnet,
      edgeType: connectors.connectorLineType
    }
    edges.push(edge);
    
    const endpointNodeId = (connectors.connectorEnd as ConnectorEndpointEndpointNodeIdAndMagnet)?.endpointNodeId
    
    if (endpointNodeId) {
      const toNode = getNodeFromId(endpointNodeId);

      if (toNode && !toNode.removed && toNode.type !== "DOCUMENT" && toNode.type !== "PAGE") {
        edge.to = traverse(toNode);
      }
    }
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
