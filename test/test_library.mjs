import crypto from 'crypto';

function generateTextNode() {
  const date = new Date().toISOString();
  const id = crypto.randomUUID();
  return {
    "type": "text",
    "content": [
      id
    ],
    "created": date,
    "modified": date,
    "id": id,
    "children": []
  };
}

const nodes = [];
const num = 10000;

for (let i = 0; i < num; i++) {
  nodes.push(generateTextNode());
}

const data = {
  "nodes": [
    {
      "type": "directory",
      "id": "master",
      "children": nodes
    },
    {
      "type": "directory",
      "id": "trash",
      "children": []
    }
  ],
  "files": [],
  "tags": [],
  "version": 10
};

console.log(JSON.stringify(data));