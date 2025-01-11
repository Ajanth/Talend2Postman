#!/usr/bin/env node

const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const SCHEMA_V2_1 = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

/**
 * Convert a single Talend Request entity to a Postman request object.
 */
function talendRequestToPostmanItem(talendRequest) {
  const { id, name, method, headers, uri, body } = talendRequest;

  const postmanMethod = method?.name || "GET";

  let scheme = (uri?.scheme?.name || "http").replace(":", "");

  let host = uri?.host || "localhost";

  let trimmedPath = (uri?.path || "").replace(/^\/+/, "");

  let rawUrl = `${scheme}://${host}`;
  if (trimmedPath) {
    rawUrl += `/${trimmedPath}`;
  }

  const [hostWithoutPort, portMaybe] = host.split(":");

  const postmanUrl = {
    raw: rawUrl,
    protocol: scheme,
    host: [hostWithoutPort],
    path: trimmedPath ? trimmedPath.split("/") : []
  };

  if (portMaybe) {
    postmanUrl.port = portMaybe;
  }

  const postmanHeaders = [];
  if (Array.isArray(headers)) {
    headers.forEach((h) => {
      if (h.enabled) {
        postmanHeaders.push({
          key: h.name,
          value: h.value
        });
      }
    });
  }

  let postmanBody = { mode: "raw", raw: "" };
  let contentTypeHeader = postmanHeaders.find(
    (hdr) => hdr.key.toLowerCase() === "content-type"
  );
  let contentType = contentTypeHeader ? contentTypeHeader.value.toLowerCase() : "";

  const formBody = body?.formBody || {};
  const formItems = formBody?.items || [];

  if (Array.isArray(formItems) && formItems.length > 0) {
    if (/x-www-form-urlencoded/i.test(formBody.encoding)) {
      postmanBody.mode = "urlencoded";
      postmanBody.urlencoded = formItems.map((fi) => ({
        key: fi.name,
        value: fi.value,
        type: "text"
      }));
    } else if (/multipart\/form-data/i.test(formBody.encoding)) {
      postmanBody.mode = "formdata";
      postmanBody.formdata = formItems.map((fi) => ({
        key: fi.name,
        value: fi.value,
        type: fi.type === "file" ? "file" : "text"
      }));
    } else {
      postmanBody = {
        mode: "raw",
        raw: body?.textBody || "",
        options: { raw: { language: "text" } }
      };
    }
  } else {
    const textBody = body?.textBody || "";
    if (contentType.includes("application/json")) {
      postmanBody.mode = "raw";
      postmanBody.raw = textBody;
      postmanBody.options = { raw: { language: "json" } };
    } else if (textBody) {
      postmanBody.mode = "raw";
      postmanBody.raw = textBody;
      postmanBody.options = { raw: { language: "text" } };
    } else {
      postmanBody.mode = "raw";
      postmanBody.raw = "";
    }
  }

  return {
    name: name || `Request ${id}`,
    request: {
      method: postmanMethod,
      header: postmanHeaders,
      body: postmanBody,
      url: postmanUrl
    },
    response: []
  };
}

function talendServiceToPostmanFolder(serviceNode) {
  const serviceEntity = serviceNode.entity;
  const serviceName = serviceEntity.name || "Unnamed Service";

  const items = [];
  if (Array.isArray(serviceNode.children)) {
    serviceNode.children.forEach((reqChild) => {
      if (reqChild.entity && reqChild.entity.type === "Request") {
        items.push(talendRequestToPostmanItem(reqChild.entity));
      }
    });
  }

  return {
    name: serviceName,
    item: items
  };
}

function talendProjectToPostmanCollection(projectNode) {
  const projectEntity = projectNode.entity;
  const projectName = projectEntity.name || "Unnamed Project";

  const items = [];
  if (Array.isArray(projectNode.children)) {
    projectNode.children.forEach((serviceChild) => {
      if (serviceChild.entity && serviceChild.entity.type === "Service") {
        items.push(talendServiceToPostmanFolder(serviceChild));
      }
    });
  }

  return {
    info: {
      _postman_id: uuidv4(),
      name: projectName,
      schema: SCHEMA_V2_1,
      _exporter_id: "talend2postman"
    },
    item: items
  };
}

function convertTalendToPostman(talendJson) {
  const projects = talendJson.entities || [];

  return projects
    .filter((p) => p.entity && p.entity.type === "Project")
    .map((project) => talendProjectToPostmanCollection(project));
}


function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node talend2postman.js <input.json> <output.json>");
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  if (!fs.existsSync(inputFile)) {
    console.error("Error: input file does not exist:", inputFile);
    process.exit(1);
  }

  let talendData;
  try {
    const rawData = fs.readFileSync(inputFile, "utf8");
    talendData = JSON.parse(rawData);
  } catch (err) {
    console.error("Error parsing input JSON:", err);
    process.exit(1);
  }

  const collections = convertTalendToPostman(talendData);

  let outputJson;
  if (collections.length === 1) {
    outputJson = JSON.stringify(collections[0], null, 2);
  } else {
    outputJson = JSON.stringify(collections, null, 2);
  }

  try {
    fs.writeFileSync(outputFile, outputJson, "utf8");
    console.log(`Successfully wrote Postman collection(s) to: ${outputFile}`);
  } catch (err) {
    console.error("Error writing output file:", err);
    process.exit(1);
  }
}

main();
