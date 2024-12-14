import fs from "fs";
import yaml from "yaml";
import path from "path";

// layer : ui | api
export const yamlParse = ({
  folder_path,
  context_file_name = "context.yml",
}) => {
  const file = fs.readFileSync(
    path.join(folder_path, context_file_name),
    "utf-8"
  );
  const data = yaml.parse(file);

  return data;
};
