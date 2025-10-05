const http = require("http");
const fs = require("fs");
const path = require("path");

const inventoryPath = path.join(__dirname, "db", "items.json");

const PORT = 8000;
const HOST_NAME = "localhost";

function validateItems(item) {
  const { id, name, price, size } = item;

  if (!id || !name || price === undefined || !size) {
    return "Missing required fields: id, name, price, and size are required";
  }
  if (typeof name !== "string" || name.trim() === "") {
    return "Name is required and must be a non-empty string";
  }
  if (typeof price !== "number" || price < 0) {
    return "Price must be a positive number";
  }
  if (!["s", "m", "l"].includes(size)) {
    return "Size must be 'small (s)', 'medium (m)', or 'large (l)' ";
  }
  if (typeof id !== "number") {
    return "ID must be a number";
  }

  return null;
}

const requestHandler = function (req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Welcome to Inventory API 👋" }));
    return;
  }

  if (req.url === "/inventory" && req.method === "GET") {
    getAllInventory(req, res);
  } else if (req.url.startsWith("/inventory/") && req.method === "GET") {
    const id = req.url.split("/")[2];
    getInventoryById(req, res, id);
  } else if (req.url === "/inventory" && req.method === "POST") {
    addInventory(req, res);
  } else if (req.url.startsWith("/inventory/") && req.method === "PUT") {
    const id = req.url.split("/")[2];
    updateInventory(req, res, id);
  } else if (req.url.startsWith("/inventory/") && req.method === "PATCH") {
    const id = req.url.split("/")[2];
    patchInventory(req, res, id);
  } else if (req.url.startsWith("/inventory/") && req.method === "DELETE") {
    const id = req.url.split("/")[2];
    deleteInventory(req, res, id);
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "Method Not Supported",
      })
    );
  }
};

// Function to get all inventory

function getAllInventory(req, res) {
  fs.readFile(inventoryPath, "utf8", (err, data) => {
    if (err) {
      console.log(err);
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: "An error occured" }));
    }
    res.writeHead(200, { "Content-Type": "application/json" });

    res.end(data);
  });
}

function getInventoryById(req, res, id) {
  fs.readFile(inventoryPath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: "Error reading database" }));
    }

    // prevent server from crashing if filedata is empty
    let fileData = [];
    try {
      if (data.trim()) {
        fileData = JSON.parse(data);
      }
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: "Corrupted database file" }));
    }

    const item = fileData.find((inv) => inv.id == id);

    if (!item) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: "Item not found" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(item));
  });
}

function addInventory(req, res) {
  const body = [];

  req.on("data", (chunk) => {
    body.push(chunk);
  });

  req.on("end", () => {
    const parsedBody = Buffer.concat(body).toString();
    const newInventory = JSON.parse(parsedBody);
    // validate body of request
    const validation = validateItems(newInventory);
    if (validation) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: validation }));
    }
    // add new inventory to the existing array
    fs.readFile(inventoryPath, "utf8", (err, data) => {
      if (err) {
        console.log(err);
        return res.writeHead(500, { "Content-Type": "application/json" });
      }

      console.log(data);

      // prevent server from crashing if filedata is empty
      let fileData = [];
      try {
        if (data.trim()) {
          fileData = JSON.parse(data);
        }
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Corrupted database file" }));
      }

      if (fileData.find((item) => item.id === newInventory.id)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ message: "Cannot save inventory with the same id" })
        );
      }
      const totalInventory = [...fileData, newInventory];

      //   write it back to your existing files
      fs.writeFile(inventoryPath, JSON.stringify(totalInventory), (err) => {
        if (err) {
          console.log(err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message:
                "Internal Server Error. Could not save inventory to database.",
            })
          );
        }
        res.writeHead(201, { "Content-Type": "application/json" });

        res.end(JSON.stringify(newInventory));
      });
    });
  });
}

function updateInventory(req, res, id) {
  const body = [];
  req.on("data", (chunk) => {
    body.push(chunk);
  });
  req.on("end", () => {
    const parsedBody = Buffer.concat(body).toString();
    const newInventory = JSON.parse(parsedBody);
    // validate body of request
    const validation = validateItems(newInventory);
    if (validation) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: validation }));
    }
    const inventoryID = newInventory.id;

    fs.readFile(inventoryPath, "utf8", (err, data) => {
      if (err) {
        console.log(err);
        return res.end(JSON.stringify({ message: "Error reading database" }));
      }
      let fileData = [];
      fileData = JSON.parse(data);
      const index = fileData.findIndex(
        (inventory) => inventory.id == inventoryID || inventory.id == id
      );

      if (index === -1) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end("Item with the specified id not found!");
        return;
      }
      fileData[index] = { ...fileData[index], ...newInventory };

      fs.writeFile(inventoryPath, JSON.stringify(fileData), (err) => {
        if (err) {
          console.log(err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message:
                "Internal Server Error. Could not save items to database.",
            })
          );
        }

        res.writeHead(200, { "Content-Type": "application/json" });

        res.end("Update successfull!");
      });
    });
  });
}
function patchInventory(req, res, id) {
  const body = [];

  req.on("data", (chunk) => {
    body.push(chunk);
  });

  req.on("end", () => {
    const parsedBody = Buffer.concat(body).toString();
    const updateFields = JSON.parse(parsedBody);
    const inventoryID = id || updateFields.id;
    // Validate only the fields that exist in the request
    if (updateFields.name !== undefined) {
      if (
        typeof updateFields.name !== "string" ||
        updateFields.name.trim() === ""
      ) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ message: "Name must be a non-empty string" })
        );
      }
    }

    if (updateFields.price !== undefined) {
      if (typeof updateFields.price !== "number" || updateFields.price < 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ message: "Price must be a positive number" })
        );
      }
    }

    if (updateFields.size !== undefined) {
      if (!["s", "m", "l"].includes(updateFields.size)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ message: "Size must be 's', 'm', or 'l'" })
        );
      }
    }

    fs.readFile(inventoryPath, "utf8", (err, data) => {
      if (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Error reading database" }));
      }
      // prevent server from crashing if filedata is empty
      let fileData = [];
      try {
        if (data.trim()) {
          fileData = JSON.parse(data);
        }
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Corrupted database file" }));
      }

      const index = fileData.findIndex(
        (inventory) => inventory.id == inventoryID || inventory.id == id
      );

      if (index === -1) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Item not found" }));
      }

      fileData[index] = { ...fileData[index], ...updateFields };

      fs.writeFile(inventoryPath, JSON.stringify(fileData, null, 2), (err) => {
        if (err) {
          console.error(err);
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ message: "Error saving database" }));
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(fileData[index]));
      });
    });
  });
}
function deleteInventory(req, res, id) {
  fs.readFile(inventoryPath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: "Error reading database" }));
    }

    // prevent server from crashing if filedata is empty
    let fileData = [];
    try {
      if (data.trim()) {
        fileData = JSON.parse(data);
      }
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: "Corrupted database file" }));
    }

    const index = fileData.findIndex((inventory) => inventory.id == id);

    if (index === -1) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: "Item not found" }));
    }

    fileData.splice(index, 1);

    fs.writeFile(inventoryPath, JSON.stringify(fileData, null, 2), (err) => {
      if (err) {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Error saving database" }));
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Deletion successful!" }));
    });
  });
}

const server = http.createServer(requestHandler);

server.listen(PORT, HOST_NAME, () => {
  console.log(`Server is listening on ${HOST_NAME}:${PORT}`);
});
