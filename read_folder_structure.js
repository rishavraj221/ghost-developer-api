import fs from "fs";
import path from "path";

// List of folders to skip
const foldersToSkip = [
  "node_modules",
  "venv",
  "__pycache__",
  ".next",
  ".git",
  "out",
];

export const getFolderStructure = ({ dir, depth = 0, as_array = false }) => {
  const files = fs.readdirSync(dir);
  const folderStructure = [];

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip folders listed in foldersToSkip
    if (stat.isDirectory() && foldersToSkip.includes(file)) {
      return; // Skip this folder and continue
    }

    if (stat.isDirectory()) {
      folderStructure.push({
        name: file,
        type: "directory",
        children: getFolderStructure({ dir: filePath, depth: depth + 1 }),
      });
    } else {
      folderStructure.push({
        name: file,
        type: "file",
      });
    }
  });

  if (as_array) return getFolderStructureArray(folderStructure);

  return folderStructure;
};

function getFolderStructureArray(structure, indent = "") {
  let result = []; // Initialize an array to hold the folder structure

  structure.forEach((item) => {
    // Add the current item to the result array with its name and indentation
    result.push(`${indent}- ${item.name}`);

    // If the item is a directory and has children, process its children recursively
    if (item.type === "directory" && item.children) {
      const children = getFolderStructureArray(item.children, indent + "  ");
      result = result.concat(children); // Concatenate the result with the children's structure
    }
  });

  return result; // Return the final structure array
}

function printFolderStructure(structure, indent = "") {
  structure.forEach((item) => {
    console.log(`${indent}- ${item.name}`);
    if (item.type === "directory" && item.children) {
      printFolderStructure(item.children, indent + "  ");
    }
  });
}

// // Specify the directory you want to get the folder structure for
// const directoryPath = path.join(
//   "/Users/rishavraj/Downloads/picalive/base-app-api"
// );

// // Get the folder structure and print it
// const folderStructure = getFolderStructure({dir: directoryPath});
// printFolderStructure(folderStructure);

export const getAllFilePaths = async (directoryPath) => {
  const filePaths = [];
  const allowedExtensions = [".js", ".jsx", ".css"];

  function readDirectory(currentPath) {
    try {
      const files = fs.readdirSync(currentPath);

      files.forEach((file) => {
        const fullPath = path.join(currentPath, file);

        // Check if the current item is a directory and should be excluded
        if (fs.statSync(fullPath).isDirectory()) {
          if (!foldersToSkip.includes(file)) {
            readDirectory(fullPath); // Recursively read subdirectories
          }
        } else {
          // Check if the file has one of the allowed extensions
          if (allowedExtensions.includes(path.extname(file))) {
            filePaths.push(fullPath); // Add the file path to the array
          }
        }
      });
    } catch (error) {
      console.error(`Error reading directory at ${currentPath}:`, error);
    }
  }

  readDirectory(directoryPath);
  return filePaths;
};

// console.log(
//   getAllFilePaths("/Users/rishavraj/Downloads/picalive/base-app-ui/src")
// );
