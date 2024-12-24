import {
  batch_input_file,
  create_batch,
  check_batch_status,
  retrieve_and_write_batch_result,
} from "../openai/generate.js";

export const batch_processing = async ({ file_path }) => {
  const res1 = await batch_input_file({ file_path });
  console.log("batch input file result", res1);

  const res2 = await create_batch({ input_file_id: res1.id });
  console.log("batch create result", res2);

  const res3 = await check_batch_status({
    batch_id: res2.id,
  });
  console.log("batch status result", res3);

  return res3;
};

// batch_processing({
//   file_path:
//     "/Users/rishavraj/Downloads/picalive/scripts/multi_agents_v2/prompt.json1",
// });

const func = async () => {
  // await check_batch_status({
  //   batch_id: "batch_67651a9af1088190ae195abcd9a69099",
  // });
  // await retrieve_and_write_batch_result({
  //   output_file_id: "file-7A8uYHewQjRsp8c6s3pT6q",
  //   file_write_full_path:
  //     "/Users/rishavraj/Downloads/picalive/scripts/multi_agents_v2/ui_knowledge_graph.json",
  // });
};

// func();
